package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/models"
)

func TestFinanceAnalyticsAndRBAC(t *testing.T) {
	router := setupTestDB(t)

	now := time.Now()

	// 1. Seed Customer
	customer := models.User{
		Email:        "finance_test_customer@example.com",
		PasswordHash: "xyz",
		Role:         models.RoleCustomer,
		IsActive:     true,
	}
	database.DB.Create(&customer)

	// 2. Seed 3 Active Subscriptions
	plan := models.Plan{
		Name:          "SaaS Monthly Plan",
		BillingPeriod: models.BillingPeriodMonthly,
	}
	database.DB.Create(&plan)

	for i := 0; i < 3; i++ {
		sub := models.Subscription{
			CustomerID:      customer.ID,
			PlanID:          plan.ID,
			Status:          models.StatusActive,
			StartDate:       now,
			NextBillingDate: now.AddDate(0, 1, 0),
		}
		database.DB.Create(&sub)
	}

	// 3. Seed Invoices:
	// Inv 1: PAID ($500.00 = 50000 cents)
	inv1 := models.Invoice{
		CustomerID:         customer.ID,
		SubscriptionID:     "sub-1",
		Status:             models.InvoiceStatusPaid,
		BillingPeriodStart: now.AddDate(0, -2, 0),
		BillingPeriodEnd:   now.AddDate(0, -1, -1),
		DueDate:            now.AddDate(0, -1, 0),
		Subtotal:           50000,
		TotalAmount:        50000,
		AmountPaid:         50000,
	}
	database.DB.Create(&inv1)

	// Inv 2: CONFIRMED, current (due in 15 days), $200.00 (20000 cents), 0 paid
	inv2 := models.Invoice{
		CustomerID:         customer.ID,
		SubscriptionID:     "sub-2",
		Status:             models.InvoiceStatusConfirmed,
		BillingPeriodStart: now,
		BillingPeriodEnd:   now.AddDate(0, 1, -1),
		DueDate:            now.AddDate(0, 0, 15),
		Subtotal:           20000,
		TotalAmount:        20000,
		AmountPaid:         0,
	}
	database.DB.Create(&inv2)

	// Inv 3: CONFIRMED, OVERDUE (due 5 days ago), $300.00 total, $100.00 paid -> $200.00 overdue balance
	inv3 := models.Invoice{
		CustomerID:         customer.ID,
		SubscriptionID:     "sub-3",
		Status:             models.InvoiceStatusConfirmed,
		BillingPeriodStart: now.AddDate(0, -1, 0),
		BillingPeriodEnd:   now.AddDate(0, 0, -1),
		DueDate:            now.AddDate(0, 0, -5), // past due
		Subtotal:           30000,
		TotalAmount:        30000,
		AmountPaid:         10000, // 10000 cents ($100.00) paid
	}
	database.DB.Create(&inv3)

	staffToken, _ := auth.GenerateJWT("staff-fin", "staff@brightloop.local", string(models.RoleStaff))
	customerToken, _ := auth.GenerateJWT(customer.ID, customer.Email, string(models.RoleCustomer))

	// 4. Test Customer Blocked from Finance Summary -> 403 Forbidden
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/api/v1/finance/summary", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for customer accessing finance summary, got %d", w.Code)
	}

	// 5. Test Staff Accesses Finance Summary -> 200 OK with correct KPI math
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/finance/summary", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK on finance summary, got %d: %s", w.Code, w.Body.String())
	}

	var res map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &res)

	execTime := res["execution_time_ms"].(float64)
	if execTime > 2000 {
		t.Fatalf("performance target failed: response took %v ms (> 2000 ms)", execTime)
	}

	summary := res["summary"].(map[string]interface{})

	// Active subscriptions = 3
	if summary["active_subscriptions"].(float64) != 3 {
		t.Fatalf("expected 3 active subscriptions, got %v", summary["active_subscriptions"])
	}

	// Total Revenue Collected = $500.00 (Inv 1) + $100.00 (Inv 3) = $600.00 (60000 cents)
	if summary["total_revenue_cents"].(float64) != 60000 {
		t.Fatalf("expected 60000 revenue cents, got %v", summary["total_revenue_cents"])
	}
	if summary["total_revenue_collected"].(float64) != 600.0 {
		t.Fatalf("expected $600.00 revenue, got %v", summary["total_revenue_collected"])
	}

	// Outstanding AR = $200.00 (Inv 2) + $200.00 (Inv 3 balance) = $400.00 (40000 cents)
	if summary["outstanding_ar_cents"].(float64) != 40000 {
		t.Fatalf("expected 40000 outstanding AR cents, got %v", summary["outstanding_ar_cents"])
	}
	if summary["outstanding_ar"].(float64) != 400.0 {
		t.Fatalf("expected $400.00 outstanding AR, got %v", summary["outstanding_ar"])
	}

	// Overdue invoices = 1, amount = $200.00 (20000 cents)
	if summary["overdue_invoices_count"].(float64) != 1 {
		t.Fatalf("expected 1 overdue invoice, got %v", summary["overdue_invoices_count"])
	}
	if summary["overdue_amount_cents"].(float64) != 20000 {
		t.Fatalf("expected 20000 overdue amount cents, got %v", summary["overdue_amount_cents"])
	}
	if summary["overdue_amount"].(float64) != 200.0 {
		t.Fatalf("expected $200.00 overdue amount, got %v", summary["overdue_amount"])
	}

	// 6. Test Reports with Overdue Filter
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/finance/reports?status=OVERDUE", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on finance reports, got %d", w.Code)
	}

	var repRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &repRes)
	reports := repRes["reports"].([]interface{})
	if len(reports) != 1 {
		t.Fatalf("expected 1 overdue invoice report item, got %d", len(reports))
	}
	item := reports[0].(map[string]interface{})
	if item["is_overdue"].(bool) != true {
		t.Fatalf("expected item.is_overdue to be true")
	}
	if item["balance_due"].(float64) != 200.0 {
		t.Fatalf("expected balance_due 200.0, got %v", item["balance_due"])
	}
}
