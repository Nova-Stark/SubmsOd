package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/finance"
	"submsod/internals/models"
)

func TestFixturesLoadingAndKPIs(t *testing.T) {
	router := setupTestDB(t)

	adminToken, err := auth.GenerateJWT("admin-id", "admin@brightloop.local", string(models.RoleAdmin))
	if err != nil {
		t.Fatalf("failed to generate admin token: %v", err)
	}

	// 1. Invoke POST /api/v1/admin/seed-fixtures
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/seed-fixtures", nil)
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on seed fixtures, got %d: %s", w.Code, w.Body.String())
	}

	// 2. Verify row counts in database
	var prodCount, planCount, taxCount, discCount, subCount, invCount int64
	database.DB.Model(&models.Product{}).Count(&prodCount)
	database.DB.Model(&models.Plan{}).Count(&planCount)
	database.DB.Model(&models.TaxRule{}).Count(&taxCount)
	database.DB.Model(&models.DiscountRule{}).Count(&discCount)
	database.DB.Model(&models.Subscription{}).Count(&subCount)
	database.DB.Model(&models.Invoice{}).Count(&invCount)

	if prodCount < 4 {
		t.Fatalf("expected at least 4 products, got %d", prodCount)
	}
	if planCount < 3 {
		t.Fatalf("expected at least 3 plans, got %d", planCount)
	}
	if discCount < 6 {
		t.Fatalf("expected at least 6 discounts, got %d", discCount)
	}
	if subCount < 100 {
		t.Fatalf("expected >= 100 subscriptions, got %d", subCount)
	}
	if invCount < 100 {
		t.Fatalf("expected >= 100 invoices, got %d", invCount)
	}

	// 3. Verify Finance Summary on loaded fixtures runs in <2s and computes non-zero numbers
	// Fixed date matching fixture snapshot (2026-10-31 UTC)
	evalDate, _ := time.Parse(time.RFC3339, "2026-10-31T12:00:00Z")
	summary, err := finance.ComputeSummary(database.DB, evalDate)
	if err != nil {
		t.Fatalf("failed to compute summary on loaded fixtures: %v", err)
	}

	if summary.ExecutionTimeMS > 2000 {
		t.Fatalf("execution time SLA failed: took %d ms (>2000ms)", summary.ExecutionTimeMS)
	}

	if summary.Summary.ActiveSubscriptions <= 0 {
		t.Fatalf("expected active subscriptions > 0, got %d", summary.Summary.ActiveSubscriptions)
	}
	if summary.Summary.TotalRevenueCollected <= 0 {
		t.Fatalf("expected collected revenue > 0, got %f", summary.Summary.TotalRevenueCollected)
	}
	if summary.Summary.OutstandingAR <= 0 {
		t.Fatalf("expected outstanding AR > 0, got %f", summary.Summary.OutstandingAR)
	}
	if summary.Summary.OverdueInvoicesCount <= 0 {
		t.Fatalf("expected overdue invoices count > 0, got %d", summary.Summary.OverdueInvoicesCount)
	}
}
