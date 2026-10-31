package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/models"
	"submsod/internals/subscription"
)

func TestSubscriptionStateMachineRules(t *testing.T) {
	now := time.Now()
	planWithPause := &models.Plan{AllowPause: true, AllowEarlyClose: true}
	planNoPause := &models.Plan{AllowPause: false, AllowEarlyClose: false}

	sub := models.Subscription{
		Status: models.StatusDraft,
		Lines: []models.SubscriptionLine{
			{ProductID: "p-1", Quantity: 1, UnitPrice: 1000},
		},
	}

	// 1. Invalid jump Draft -> Active rejected
	err := subscription.TransitionToActive(&sub, now)
	if err != subscription.ErrInvalidStateTransition {
		t.Fatalf("expected ErrInvalidStateTransition, got %v", err)
	}

	// 2. Draft -> Quotation
	err = subscription.TransitionToQuotation(&sub, 15, now)
	if err != nil || sub.Status != models.StatusQuotation {
		t.Fatalf("expected Quotation status, got %v, err: %v", sub.Status, err)
	}

	// 3. Quotation -> Confirmed
	err = subscription.TransitionToConfirmed(&sub, now)
	if err != nil || sub.Status != models.StatusConfirmed {
		t.Fatalf("expected Confirmed status, got %v, err: %v", sub.Status, err)
	}

	// 4. Confirmed -> Active
	err = subscription.TransitionToActive(&sub, now)
	if err != nil || sub.Status != models.StatusActive {
		t.Fatalf("expected Active status, got %v, err: %v", sub.Status, err)
	}

	// 5. Active -> Paused (policy disallows)
	err = subscription.TransitionToPaused(&sub, planNoPause)
	if err != subscription.ErrPauseNotAllowed {
		t.Fatalf("expected ErrPauseNotAllowed, got %v", err)
	}

	// 6. Active -> Paused (policy allows)
	err = subscription.TransitionToPaused(&sub, planWithPause)
	if err != nil || sub.Status != models.StatusPaused {
		t.Fatalf("expected Paused status, got %v, err: %v", sub.Status, err)
	}

	// 7. Paused -> Active
	err = subscription.TransitionToActive(&sub, now)
	if err != nil || sub.Status != models.StatusActive {
		t.Fatalf("expected Active status, got %v, err: %v", sub.Status, err)
	}

	// 8. Active -> Closed
	future := now.AddDate(1, 0, 0)
	sub.ExpiryDate = &future
	// Early close blocked if policy false
	err = subscription.TransitionToClosed(&sub, planNoPause, now)
	if err != subscription.ErrEarlyCloseNotAllowed {
		t.Fatalf("expected ErrEarlyCloseNotAllowed, got %v", err)
	}

	// Early close allowed
	err = subscription.TransitionToClosed(&sub, planWithPause, now)
	if err != nil || sub.Status != models.StatusClosed {
		t.Fatalf("expected Closed status, got %v, err: %v", sub.Status, err)
	}
}

func TestSubscriptionLifecycleFlowAPI(t *testing.T) {
	router := setupTestDB(t)
	defer os.Remove("data/test_brightloop.db")

	// Seed customer
	customer := models.User{
		Email:        "acme@example.com",
		PasswordHash: "xyz",
		Role:         models.RoleCustomer,
		IsActive:     true,
	}
	database.DB.Create(&customer)

	// Seed product
	product := models.Product{
		Name:       "Brightloop CRM",
		Type:       models.ProductTypeSoftware,
		SalesPrice: 20000,
	}
	database.DB.Create(&product)

	// Seed plan
	plan := models.Plan{
		Name:            "Monthly Growth",
		BillingPeriod:   models.BillingPeriodMonthly,
		MinQuantity:     1,
		AutoClose:       true,
		AllowPause:      true,
		AllowEarlyClose: true,
		AllowRenewal:    true,
	}
	database.DB.Create(&plan)

	staffToken, _ := auth.GenerateJWT("staff-1", "sales@brightloop.local", string(models.RoleStaff))
	customerToken, _ := auth.GenerateJWT(customer.ID, customer.Email, string(models.RoleCustomer))

	// 1. Staff creates Quotation Template
	tmplPayload, _ := json.Marshal(map[string]interface{}{
		"name":          "Standard SaaS Deal",
		"validity_days": 14,
		"lines": []map[string]interface{}{
			{"product_id": product.ID, "quantity": 3},
		},
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/quotation-templates", bytes.NewBuffer(tmplPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("failed to create quotation template: %d %s", w.Code, w.Body.String())
	}
	var tmpl models.QuotationTemplate
	_ = json.Unmarshal(w.Body.Bytes(), &tmpl)

	// 2. Staff converts Template into Draft subscription
	fromTmplPayload, _ := json.Marshal(map[string]interface{}{
		"template_id": tmpl.ID,
		"customer_id": customer.ID,
		"plan_id":     plan.ID,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/quotations/from-template", bytes.NewBuffer(fromTmplPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("failed to convert template to subscription draft: %d %s", w.Code, w.Body.String())
	}
	var sub models.Subscription
	_ = json.Unmarshal(w.Body.Bytes(), &sub)

	if sub.Status != models.StatusDraft {
		t.Fatalf("expected DRAFT status, got %s", sub.Status)
	}

	// 3. Staff sends quote (Draft -> Quotation)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/subscriptions/"+sub.ID+"/send-quote", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to send quote: %d %s", w.Code, w.Body.String())
	}

	// 4. Customer confirms quote (Quotation -> Confirmed)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/subscriptions/"+sub.ID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to confirm quote: %d %s", w.Code, w.Body.String())
	}

	// 5. Staff activates subscription (Confirmed -> Active)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/subscriptions/"+sub.ID+"/activate", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to activate subscription: %d %s", w.Code, w.Body.String())
	}

	// 6. Customer views own subscriptions via portal
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/portal/subscriptions", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to query portal subscriptions: %d %s", w.Code, w.Body.String())
	}
	var customerSubs []models.Subscription
	_ = json.Unmarshal(w.Body.Bytes(), &customerSubs)
	if len(customerSubs) != 1 || customerSubs[0].Status != models.StatusActive {
		t.Fatalf("expected 1 ACTIVE portal subscription")
	}

	// 7. Customer self-serve pauses subscription
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/subscriptions/"+sub.ID+"/pause", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to pause subscription: %d %s", w.Code, w.Body.String())
	}

	// 8. Customer self-serve resumes subscription
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/subscriptions/"+sub.ID+"/resume", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to resume subscription: %d %s", w.Code, w.Body.String())
	}
}
