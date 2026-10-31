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
	"submsod/internals/subscription"
)

// TestEdgeCasesDomainRules tests edge cases across auth, discounts, state transitions, and billing
func TestEdgeCasesDomainRules(t *testing.T) {
	router := setupTestDB(t)

	now := time.Now()
	adminToken, _ := auth.GenerateJWT("admin-id", "admin@brightloop.local", string(models.RoleAdmin))
	staffToken, _ := auth.GenerateJWT("staff-id", "staff@brightloop.local", string(models.RoleStaff))

	// ==========================================
	// 1. AUTH EDGE CASES
	// ==========================================
	t.Run("Auth Edge Cases", func(t *testing.T) {
		// 1a. Duplicate signup case insensitivity
		s1, _ := json.Marshal(map[string]string{
			"email":    "case_test@example.com",
			"password": "Password123!",
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/auth/signup", bytes.NewBuffer(s1))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)
		if w.Code != http.StatusCreated {
			t.Fatalf("expected 201 on initial signup, got %d", w.Code)
		}

		s2, _ := json.Marshal(map[string]string{
			"email":    "CASE_TEST@EXAMPLE.COM",
			"password": "Password123!",
		})
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/auth/signup", bytes.NewBuffer(s2))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)
		if w.Code != http.StatusConflict {
			t.Fatalf("expected 409 Conflict for uppercase duplicate email, got %d", w.Code)
		}

		// 1b. Expired token reset
		var user models.User
		database.DB.Where("email = ?", "case_test@example.com").First(&user)

		expiredToken := models.AuthToken{
			UserID:    user.ID,
			TokenCode: "expired-token-12345",
			TokenType: models.TokenTypePasswordReset,
			ExpiresAt: now.Add(-1 * time.Hour), // 1 hour ago
			Used:      false,
		}
		database.DB.Create(&expiredToken)

		resetPayload, _ := json.Marshal(map[string]string{
			"email":        "case_test@example.com",
			"token_code":   "expired-token-12345",
			"new_password": "NewValidPass123!",
		})
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/auth/reset-password", bytes.NewBuffer(resetPayload))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 Bad Request on expired reset token, got %d", w.Code)
		}

		// 1c. Reusing already used token
		usedToken := models.AuthToken{
			UserID:    user.ID,
			TokenCode: "used-token-12345",
			TokenType: models.TokenTypePasswordReset,
			ExpiresAt: now.Add(1 * time.Hour),
			Used:      true,
		}
		database.DB.Create(&usedToken)

		resetPayload2, _ := json.Marshal(map[string]string{
			"email":        "case_test@example.com",
			"token_code":   "used-token-12345",
			"new_password": "NewValidPass123!",
		})
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/auth/reset-password", bytes.NewBuffer(resetPayload2))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 Bad Request on already used reset token, got %d", w.Code)
		}
	})

	// ==========================================
	// 2. DISCOUNT RULES EDGE CASES
	// ==========================================
	t.Run("Discount Cap and Boundary Cases", func(t *testing.T) {
		// 2a. Discount code max usage limit
		singleUseDisc := models.DiscountRule{
			Code:        "ONCEONLY",
			Type:        models.DiscountTypeFixed,
			Value:       1000,
			MaxUses:     1,
			CurrentUses: 1, // Cap reached
			IsActive:    true,
		}
		database.DB.Create(&singleUseDisc)

		valPayload, _ := json.Marshal(map[string]interface{}{
			"code":           "ONCEONLY",
			"total_quantity": 1,
			"subtotal_cents": 5000,
		})
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/catalog/discounts/validate", bytes.NewBuffer(valPayload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+adminToken)
		router.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for max usage exceeded discount, got %d", w.Code)
		}

		// 2b. Minimum spend threshold boundary
		minSpendDisc := models.DiscountRule{
			Code:              "MINSPEND",
			Type:              models.DiscountTypeFixed,
			Value:             2000,
			MinPurchaseAmount: 10000, // min $100.00
			IsActive:          true,
		}
		database.DB.Create(&minSpendDisc)

		// 1 cent below threshold ($99.99 = 9999 cents) -> REJECT
		valBelow, _ := json.Marshal(map[string]interface{}{
			"code":           "MINSPEND",
			"total_quantity": 1,
			"subtotal_cents": 9999,
		})
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/catalog/discounts/validate", bytes.NewBuffer(valBelow))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+adminToken)
		router.ServeHTTP(w, req)
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400 for spend below minimum threshold, got %d", w.Code)
		}

		// Exact threshold ($100.00 = 10000 cents) -> PASS
		valExact, _ := json.Marshal(map[string]interface{}{
			"code":           "MINSPEND",
			"total_quantity": 1,
			"subtotal_cents": 10000,
		})
		w = httptest.NewRecorder()
		req, _ = http.NewRequest("POST", "/api/v1/catalog/discounts/validate", bytes.NewBuffer(valExact))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+adminToken)
		router.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 for exact spend match, got %d", w.Code)
		}
	})

	// ==========================================
	// 3. SUBSCRIPTION STATE MACHINE EDGE CASES
	// ==========================================
	t.Run("Subscription State Transitions Edge Cases", func(t *testing.T) {
		// 3a. Expired quotation cannot be confirmed
		pastDate := now.Add(-2 * 24 * time.Hour)
		expiredQuote := models.Subscription{
			Status:     models.StatusQuotation,
			ValidUntil: &pastDate,
		}
		err := subscription.TransitionToConfirmed(&expiredQuote, now)
		if err != subscription.ErrQuotationExpired {
			t.Fatalf("expected ErrQuotationExpired, got %v", err)
		}

		// 3b. Pausing a plan that forbids pausing
		strictPlan := &models.Plan{AllowPause: false, AllowEarlyClose: false}
		activeSub := models.Subscription{
			Status: models.StatusActive,
		}
		err = subscription.TransitionToPaused(&activeSub, strictPlan)
		if err != subscription.ErrPauseNotAllowed {
			t.Fatalf("expected ErrPauseNotAllowed, got %v", err)
		}

		// 3c. Early closing a plan that forbids early closing
		futureExpiry := now.AddDate(0, 6, 0)
		activeSub.ExpiryDate = &futureExpiry
		err = subscription.TransitionToClosed(&activeSub, strictPlan, now)
		if err != subscription.ErrEarlyCloseNotAllowed {
			t.Fatalf("expected ErrEarlyCloseNotAllowed, got %v", err)
		}
	})

	// ==========================================
	// 4. BILLING & FINANCE EDGE CASES
	// ==========================================
	t.Run("Billing and Finance Edge Cases", func(t *testing.T) {
		// 4a. Inactive subscriptions (PAUSED, CLOSED, DRAFT) are never billed
		pausedSub := models.Subscription{
			CustomerID:      "cust-paused",
			PlanID:          "plan-1",
			Status:          models.StatusPaused,
			NextBillingDate: now.AddDate(0, -1, 0), // past due date
		}
		closedSub := models.Subscription{
			CustomerID:      "cust-closed",
			PlanID:          "plan-1",
			Status:          models.StatusClosed,
			NextBillingDate: now.AddDate(0, -1, 0), // past due date
		}
		database.DB.Create(&pausedSub)
		database.DB.Create(&closedSub)

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/api/v1/billing/run", nil)
		req.Header.Set("Authorization", "Bearer "+staffToken)
		router.ServeHTTP(w, req)

		var batchRes map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &batchRes)
		resData := batchRes["result"].(map[string]interface{})
		if resData["invoices_created"].(float64) != 0 {
			t.Fatalf("expected 0 invoices created for paused/closed subscriptions, got %v", resData["invoices_created"])
		}

		// 4b. Paid invoices with past due dates are NOT counted as overdue
		pastDueDate := now.Add(-10 * 24 * time.Hour)
		paidOldInvoice := models.Invoice{
			CustomerID:         "cust-1",
			SubscriptionID:     "sub-1",
			Status:             models.InvoiceStatusPaid,
			BillingPeriodStart: pastDueDate.AddDate(0, -1, 0),
			BillingPeriodEnd:   pastDueDate,
			DueDate:            pastDueDate,
			Subtotal:           10000,
			TotalAmount:        10000,
			AmountPaid:         10000,
		}
		database.DB.Create(&paidOldInvoice)

		w = httptest.NewRecorder()
		req, _ = http.NewRequest("GET", "/api/v1/finance/summary", nil)
		req.Header.Set("Authorization", "Bearer "+staffToken)
		router.ServeHTTP(w, req)

		var finRes map[string]interface{}
		_ = json.Unmarshal(w.Body.Bytes(), &finRes)
		summary := finRes["summary"].(map[string]interface{})
		if summary["overdue_invoices_count"].(float64) != 0 {
			t.Fatalf("expected 0 overdue invoices when invoice is PAID, got %v", summary["overdue_invoices_count"])
		}
	})
}

// TestHighConcurrencyStress tests 40 goroutines simultaneously executing cross-domain financial operations
func TestHighConcurrencyStress(t *testing.T) {
	router := setupTestDB(t)

	now := time.Now()

	// Seed product & plan
	prod := models.Product{Name: "Core Suite", Type: models.ProductTypeSoftware, SalesPrice: 10000}
	database.DB.Create(&prod)

	plan := models.Plan{
		Name:          "SaaS Monthly Concurrent",
		BillingPeriod: models.BillingPeriodMonthly,
		MinQuantity:   1,
		AllowPause:    true,
	}
	database.DB.Create(&plan)

	staffToken, _ := auth.GenerateJWT("staff-concurrent", "staff@brightloop.local", string(models.RoleStaff))

	concurrencyCount := 40
	var wg sync.WaitGroup
	errCh := make(chan error, concurrencyCount*5)

	gate := make(chan struct{})

	for i := 0; i < concurrencyCount; i++ {
		workerID := i
		wg.Add(1)

		go func(id int) {
			defer wg.Done()
			<-gate // await gate release

			email := fmt.Sprintf("stress_%d_%d@example.com", id, time.Now().UnixNano())

			// 1. Concurrent Signup
			payload, _ := json.Marshal(map[string]string{
				"email":    email,
				"password": "Password123!",
			})
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/api/v1/auth/signup", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)
			if w.Code != http.StatusCreated {
				errCh <- fmt.Errorf("worker %d signup failed: %d", id, w.Code)
				return
			}

			var signupRes map[string]interface{}
			_ = json.Unmarshal(w.Body.Bytes(), &signupRes)
			userMap := signupRes["user"].(map[string]interface{})
			userID := userMap["id"].(string)
			userToken := signupRes["token"].(string)

			// 2. Create and Activate Subscription
			subPayload, _ := json.Marshal(map[string]interface{}{
				"customer_id": userID,
				"plan_id":     plan.ID,
				"lines": []map[string]interface{}{
					{"product_id": prod.ID, "quantity": 1},
				},
			})
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", "/api/v1/subscriptions", bytes.NewBuffer(subPayload))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusCreated {
				errCh <- fmt.Errorf("worker %d sub create failed: %d", id, w.Code)
				return
			}
			var sub models.Subscription
			_ = json.Unmarshal(w.Body.Bytes(), &sub)

			// Fast track: Quote -> Confirm -> Activate
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/v1/subscriptions/%s/send-quote", sub.ID), nil)
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)

			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/v1/subscriptions/%s/confirm", sub.ID), nil)
			req.Header.Set("Authorization", "Bearer "+userToken)
			router.ServeHTTP(w, req)

			w = httptest.NewRecorder()
			req, _ = http.NewRequest("POST", fmt.Sprintf("/api/v1/subscriptions/%s/activate", sub.ID), nil)
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d activate failed: %d", id, w.Code)
				return
			}

			// 3. Concurrent Finance Summary Query
			w = httptest.NewRecorder()
			req, _ = http.NewRequest("GET", "/api/v1/finance/summary", nil)
			req.Header.Set("Authorization", "Bearer "+staffToken)
			router.ServeHTTP(w, req)
			if w.Code != http.StatusOK {
				errCh <- fmt.Errorf("worker %d finance summary failed: %d", id, w.Code)
				return
			}

		}(workerID)
	}

	// Release all workers simultaneously
	close(gate)

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		// Completed safely
	case <-time.After(20 * time.Second):
		t.Fatalf("High concurrency test timed out (deadlock or goroutine stall)")
	}

	close(errCh)
	var errs int
	for err := range errCh {
		t.Errorf("Concurrency error: %v", err)
		errs++
	}
	if errs > 0 {
		t.Fatalf("%d concurrency errors detected", errs)
	}

	// Run Batch Billing after all active subscriptions created
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/billing/run", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on batch billing run, got %d", w.Code)
	}

	var batchRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &batchRes)
	resData := batchRes["result"].(map[string]interface{})
	if resData["invoices_created"].(float64) != float64(concurrencyCount) {
		t.Fatalf("expected %d invoices created, got %v", concurrencyCount, resData["invoices_created"])
	}

	// Verify Finance Summary reflects all created invoices
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/finance/summary", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	var finRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &finRes)
	summary := finRes["summary"].(map[string]interface{})
	if summary["active_subscriptions"].(float64) != float64(concurrencyCount) {
		t.Fatalf("expected %d active subscriptions in summary, got %v", concurrencyCount, summary["active_subscriptions"])
	}
	_ = now
}
