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
	"submsod/internals/catalog"
	"submsod/internals/models"
)

func TestCatalogEngineCalculations(t *testing.T) {
	// 1. Variant Effective Price Test
	baseProduct := models.Product{
		Name:       "Brightloop Base Software",
		SalesPrice: 10000, // $100.00
	}
	odooVariant := models.ProductVariant{
		VariantName: "Brand: Odoo",
		PriceExtra:  56000, // +$560.00
	}

	priceWithoutVariant := catalog.CalculateEffectiveUnitPrice(baseProduct, nil)
	if priceWithoutVariant != 10000 {
		t.Fatalf("expected 10000, got %d", priceWithoutVariant)
	}

	priceWithVariant := catalog.CalculateEffectiveUnitPrice(baseProduct, &odooVariant)
	if priceWithVariant != 66000 {
		t.Fatalf("expected 66000 ($660.00), got %d", priceWithVariant)
	}

	// 2. Discount Rules Calculation
	now := time.Now()
	fixedRule := models.DiscountRule{
		Code:        "SAVE50",
		Type:        models.DiscountTypeFixed,
		Value:       5000, // $50.00
		MinQuantity: 5,
		IsActive:    true,
	}

	// Below min quantity -> reject
	_, err := catalog.EvaluateDiscount(&fixedRule, 4, 20000, now)
	if err != catalog.ErrDiscountMinQuantity {
		t.Fatalf("expected ErrDiscountMinQuantity, got %v", err)
	}

	// At or above min quantity -> $50 off
	discount, err := catalog.EvaluateDiscount(&fixedRule, 5, 20000, now)
	if err != nil || discount != 5000 {
		t.Fatalf("expected 5000 discount, got %d (err: %v)", discount, err)
	}

	// Percentage discount: 15% off $1000.00 (100000 cents) = 15000 cents
	pctRule := models.DiscountRule{
		Code:     "VIP15",
		Type:     models.DiscountTypePercentage,
		Value:    15.0,
		IsActive: true,
	}
	discount, err = catalog.EvaluateDiscount(&pctRule, 1, 100000, now)
	if err != nil || discount != 15000 {
		t.Fatalf("expected 15000 cents discount, got %d (err: %v)", discount, err)
	}

	// 3. Tax Calculation Test: 18% of $100.00 = $18.00 (1800 cents)
	taxRules := []models.TaxRule{
		{Name: "VAT", RatePercentage: 18.0, IsActive: true},
	}
	tax := catalog.CalculateTax(10000, taxRules)
	if tax != 1800 {
		t.Fatalf("expected 1800 tax cents, got %d", tax)
	}
}

func TestCatalogAPIEndpoints(t *testing.T) {
	router := setupTestDB(t)
	defer os.Remove("data/test_brightloop.db")

	adminToken, err := auth.GenerateJWT("admin-1", "admin@brightloop.local", string(models.RoleAdmin))
	if err != nil {
		t.Fatalf("failed to generate admin token: %v", err)
	}
	customerToken, err := auth.GenerateJWT("cust-1", "cust@example.com", string(models.RoleCustomer))
	if err != nil {
		t.Fatalf("failed to generate customer token: %v", err)
	}

	// 1. Customer attempts to create product -> Forbidden 403
	productPayload, _ := json.Marshal(map[string]interface{}{
		"name":        "Brightloop ERP",
		"type":        "SOFTWARE",
		"sales_price": 10000,
		"cost_price":  5000,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/admin/catalog/products", bytes.NewBuffer(productPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for non-admin, got %d", w.Code)
	}

	// 2. Admin creates product with "Brand: Odoo" variant -> Created 201
	adminProductPayload, _ := json.Marshal(map[string]interface{}{
		"name":        "Brightloop ERP",
		"type":        "SOFTWARE",
		"sales_price": 10000,
		"cost_price":  5000,
		"variants": []map[string]interface{}{
			{
				"variant_name": "Brand: Odoo",
				"price_extra":  56000, // +$560.00
			},
		},
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/admin/catalog/products", bytes.NewBuffer(adminProductPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 created, got %d: %s", w.Code, w.Body.String())
	}

	// 3. Admin creates Monthly Plan -> Created 201
	planPayload, _ := json.Marshal(map[string]interface{}{
		"name":           "Standard Monthly Plan",
		"billing_period": "MONTHLY",
		"min_quantity":   1,
		"auto_close":     true,
		"allow_pause":    true,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/admin/catalog/plans", bytes.NewBuffer(planPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 on plan creation, got %d: %s", w.Code, w.Body.String())
	}

	// 4. Admin creates Discount rule -> Created 201
	discountPayload, _ := json.Marshal(map[string]interface{}{
		"code":         "SAVE20",
		"type":         "PERCENTAGE",
		"value":        20.0,
		"min_quantity": 2,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/admin/catalog/discounts", bytes.NewBuffer(discountPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 on discount creation, got %d: %s", w.Code, w.Body.String())
	}

	// 5. Validate Discount endpoint -> Status 200 with discount calculated
	validatePayload, _ := json.Marshal(map[string]interface{}{
		"code":           "SAVE20",
		"total_quantity": 2,
		"subtotal_cents": 50000, // $500.00
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/catalog/discounts/validate", bytes.NewBuffer(validatePayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 on discount validation, got %d: %s", w.Code, w.Body.String())
	}

	var valRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &valRes)
	if valRes["discount_cents"].(float64) != 10000 { // 20% of 50000 = 10000 ($100.00)
		t.Fatalf("expected 10000 discount cents, got %v", valRes["discount_cents"])
	}

	// 6. Admin creates Tax Rule -> Created 201
	taxPayload, _ := json.Marshal(map[string]interface{}{
		"name":            "Standard VAT",
		"rate_percentage": 18.0,
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/admin/catalog/taxes", bytes.NewBuffer(taxPayload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201 on tax creation, got %d: %s", w.Code, w.Body.String())
	}
}
