package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/models"
)

func TestConcurrentGoroutineIntegration(t *testing.T) {
	router := setupTestDB(t)

	// Seed product
	prod := models.Product{
		Name:       "High-Load SaaS Suite",
		Type:       models.ProductTypeSoftware,
		SalesPrice: 15000,
	}
	database.DB.Create(&prod)

	// Seed plan
	plan := models.Plan{
		Name:            "Enterprise Concurrent Plan",
		BillingPeriod:   models.BillingPeriodMonthly,
		MinQuantity:     1,
		AutoClose:       true,
		AllowPause:      true,
		AllowEarlyClose: true,
		AllowRenewal:    true,
	}
	database.DB.Create(&plan)

	// Seed staff
	staffToken, err := auth.GenerateJWT("staff-worker", "worker@brightloop.local", string(models.RoleStaff))
	if err != nil {
		t.Fatalf("failed to generate staff token: %v", err)
	}

	numWorkers := 30
	var wg sync.WaitGroup
	errCh := make(chan error, numWorkers*5)

	startSignal := make(chan struct{})

	for i := 0; i < numWorkers; i++ {
		workerID := i
		wg.Add(1)

		go func(id int) {
			defer wg.Done()

			// Wait for start signal so all goroutines fire simultaneously
			<-startSignal

			email := fmt.Sprintf("tenant_%d_%d@example.com", id, time.Now().UnixNano())
			password := "SecretPass123!"

			// 1. Concurrent Signup
			signupPayload, _ := json.Marshal(map[string]string{
				"email":    email,
				"password": password,
			})
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/v1/auth/signup", bytes.NewBuffer(signupPayload))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				errCh <- fmt.Errorf("worker %d signup failed with code %d: %s", id, w.Code, w.Body.String())
				return
			}

			var signupRes map[string]interface{}
			_ = json.Unmarshal(w.Body.Bytes(), &signupRes)
			userMap := signupRes["user"].(map[string]interface{})
			userID := userMap["id"].(string)
			customerToken := signupRes["token"].(string)

			// 2. Concurrent Catalog Query
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("GET", "/api/v1/catalog/products", nil)
			req.Header.Set("Authorization", "Bearer "+customerToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d failed to fetch catalog: %d", id, w.Code)
				return
			}

			// 3. Concurrent Create Subscription Draft
			subPayload, _ := json.Marshal(map[string]interface{}{
				"customer_id": userID,
				"plan_id":     plan.ID,
				"lines": []map[string]interface{}{
					{"product_id": prod.ID, "quantity": 2},
				},
			})
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", "/api/v1/subscriptions", bytes.NewBuffer(subPayload))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				errCh <- fmt.Errorf("worker %d failed to create draft: %d %s", id, w.Code, w.Body.String())
				return
			}

			var sub models.Subscription
			_ = json.Unmarshal(w.Body.Bytes(), &sub)

			// 4. Concurrent Send Quote (Draft -> Quotation)
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/v1/subscriptions/%s/send-quote", sub.ID), nil)
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d failed to send quote: %d %s", id, w.Code, w.Body.String())
				return
			}

			// 5. Concurrent Confirm Quote (Quotation -> Confirmed)
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/v1/subscriptions/%s/confirm", sub.ID), nil)
			req.Header.Set("Authorization", "Bearer "+customerToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d failed to confirm quote: %d %s", id, w.Code, w.Body.String())
				return
			}

			// 6. Concurrent Activate (Confirmed -> Active)
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/v1/subscriptions/%s/activate", sub.ID), nil)
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d failed to activate: %d %s", id, w.Code, w.Body.String())
				return
			}

			// 7. Concurrent Portal Verification
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("GET", "/api/v1/portal/subscriptions", nil)
			req.Header.Set("Authorization", "Bearer "+customerToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d failed to fetch portal subs: %d", id, w.Code)
				return
			}

		}(workerID)
	}

	// Trigger all goroutines simultaneously
	close(startSignal)

	// Wait with timeout to detect any deadlock
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		// Succeeded in time
	case <-time.After(15 * time.Second):
		t.Fatalf("Deadlock or hanging goroutine detected: timed out after 15 seconds")
	}

	close(errCh)
	var errCount int
	for err := range errCh {
		t.Errorf("Concurrent worker error: %v", err)
		errCount++
	}

	if errCount > 0 {
		t.Fatalf("%d errors occurred during concurrent integration test", errCount)
	}

	// Verify total subscriptions in database matches worker count
	var activeCount int64
	database.DB.Model(&models.Subscription{}).Where("status = ? AND plan_id = ?", models.StatusActive, plan.ID).Count(&activeCount)
	if activeCount != int64(numWorkers) {
		t.Fatalf("expected %d active subscriptions, got %d", numWorkers, activeCount)
	}
}
