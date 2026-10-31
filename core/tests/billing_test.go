package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/models"
)

func TestBillingEngineAndPaymentFlow(t *testing.T) {
	router := setupTestDB(t)

	now := time.Now()

	// 1. Seed Customer
	customer := models.User{
		Email:        "billing_user@example.com",
		PasswordHash: "xyz",
		Role:         models.RoleCustomer,
		IsActive:     true,
	}
	database.DB.Create(&customer)

	// 2. Seed Product & Variant (Brand: Odoo adds 56000 cents)
	product := models.Product{
		Name:       "Brightloop ERP",
		Type:       models.ProductTypeSoftware,
		SalesPrice: 10000, // $100.00
	}
	database.DB.Create(&product)

	variant := models.ProductVariant{
		ProductID:   product.ID,
		VariantName: "Brand: Odoo",
		PriceExtra:  56000, // +$560.00
	}
	database.DB.Create(&variant)

	// 3. Seed Plan (Monthly)
	plan := models.Plan{
		Name:          "Growth Monthly",
		BillingPeriod: models.BillingPeriodMonthly,
		MinQuantity:   1,
	}
	database.DB.Create(&plan)

	// 4. Seed Tax Rule (10%)
	taxRule := models.TaxRule{
		Name:           "State Tax",
		RatePercentage: 10.0,
		IsActive:       true,
	}
	database.DB.Create(&taxRule)

	// 5. Seed Discount ($50 off)
	discount := models.DiscountRule{
		Code:     "OFF50",
		Type:     models.DiscountTypeFixed,
		Value:    5000, // $50.00 (5000 cents)
		IsActive: true,
	}
	database.DB.Create(&discount)

	// 6. Seed Active Subscription due today
	effectiveUnitPrice := product.SalesPrice + variant.PriceExtra // 66000 cents ($660.00)
	sub := models.Subscription{
		CustomerID:        customer.ID,
		PlanID:            plan.ID,
		Status:            models.StatusActive,
		StartDate:         now.AddDate(0, -1, 0),
		NextBillingDate:   now,
		AppliedDiscountID: &discount.ID,
		Lines: []models.SubscriptionLine{
			{
				ProductID: product.ID,
				VariantID: &variant.ID,
				Quantity:  1,
				UnitPrice: effectiveUnitPrice,
				Subtotal:  effectiveUnitPrice,
			},
		},
	}
	database.DB.Create(&sub)

	staffToken, _ := auth.GenerateJWT("staff-billing", "staff@brightloop.local", string(models.RoleStaff))
	customerToken, _ := auth.GenerateJWT(customer.ID, customer.Email, string(models.RoleCustomer))

	// 7. Trigger Batch Billing Run
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/billing/run", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on billing run, got %d: %s", w.Code, w.Body.String())
	}

	var batchRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &batchRes)
	resData := batchRes["result"].(map[string]interface{})

	if resData["invoices_created"].(float64) != 1 {
		t.Fatalf("expected 1 invoice created, got %v", resData["invoices_created"])
	}

	invoiceIDs := resData["invoice_ids"].([]interface{})
	invoiceID := invoiceIDs[0].(string)

	// 8. Test Idempotency: Trigger billing run again immediately -> should skip
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/billing/run", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on second billing run, got %d", w.Code)
	}
	var secondBatchRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &secondBatchRes)
	secondData := secondBatchRes["result"].(map[string]interface{})
	if secondData["invoices_created"].(float64) != 0 {
		t.Fatalf("idempotency failed: expected 0 invoices created on re-run, got %v", secondData["invoices_created"])
	}

	// 9. Inspect created invoice & verify mathematical precision
	// Subtotal = 66000 cents ($660)
	// Discount = 5000 cents ($50)
	// Taxable = 61000 cents ($610)
	// Tax (10%) = 6100 cents ($61)
	// Total = 67100 cents ($671)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/invoices/"+invoiceID, nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	var inv models.Invoice
	_ = json.Unmarshal(w.Body.Bytes(), &inv)

	if inv.Subtotal != 66000 {
		t.Fatalf("expected subtotal 66000, got %d", inv.Subtotal)
	}
	if inv.DiscountAmount != 5000 {
		t.Fatalf("expected discount 5000, got %d", inv.DiscountAmount)
	}
	if inv.TaxAmount != 6100 {
		t.Fatalf("expected tax 6100, got %d", inv.TaxAmount)
	}
	if inv.TotalAmount != 67100 {
		t.Fatalf("expected total 67100, got %d", inv.TotalAmount)
	}

	// 10. Confirm Invoice (Draft -> Confirmed)
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/invoices/"+invoiceID+"/confirm", nil)
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK {
		t.Fatalf("failed to confirm invoice: %d", w.Code)
	}

	// 11. Printable HTML invoice
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/invoices/"+invoiceID+"/print", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)
	if w.Code != http.StatusOK || !bytes.Contains(w.Body.Bytes(), []byte("Brightloop Software")) {
		t.Fatalf("failed to generate printable HTML invoice")
	}

	// 12. Partial Payment ($300.00 = 30000 cents) -> Remains Confirmed
	pay1, _ := json.Marshal(map[string]interface{}{
		"payment_method": "CREDIT_CARD",
		"amount":         30000,
		"notes":          "Partial upfront payment",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/invoices/"+invoiceID+"/payments", bytes.NewBuffer(pay1))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to log payment 1: %d %s", w.Code, w.Body.String())
	}

	// 13. Final Payment ($371.00 = 37100 cents) -> Moves to PAID
	pay2, _ := json.Marshal(map[string]interface{}{
		"payment_method": "BANK_TRANSFER",
		"amount":         37100,
		"notes":          "Settlement final balance",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/invoices/"+invoiceID+"/payments", bytes.NewBuffer(pay2))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+staffToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to log payment 2: %d %s", w.Code, w.Body.String())
	}

	var payRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &payRes)
	invData := payRes["invoice"].(map[string]interface{})
	if invData["status"].(string) != string(models.InvoiceStatusPaid) {
		t.Fatalf("expected invoice status PAID, got %s", invData["status"])
	}
	if invData["balance_due"].(float64) != 0 {
		t.Fatalf("expected balance_due 0, got %v", invData["balance_due"])
	}

	// 14. Customer Portal verifies invoice status
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("GET", "/api/v1/portal/invoices", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("failed to fetch portal invoices: %d", w.Code)
	}
	var customerInvoices []models.Invoice
	_ = json.Unmarshal(w.Body.Bytes(), &customerInvoices)
	if len(customerInvoices) != 1 || customerInvoices[0].Status != models.InvoiceStatusPaid {
		t.Fatalf("expected 1 PAID invoice in portal")
	}
}
