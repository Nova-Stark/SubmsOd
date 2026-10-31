package catalog

import (
	"errors"
	"math"
	"time"

	"submsod/internals/models"
)

var (
	ErrDiscountNotFound      = errors.New("discount rule not found")
	ErrDiscountInactive      = errors.New("discount is inactive")
	ErrDiscountExpired       = errors.New("discount has expired")
	ErrDiscountNotStarted    = errors.New("discount has not started yet")
	ErrDiscountUsageExceeded = errors.New("discount usage limit reached")
	ErrDiscountMinSpend      = errors.New("order does not meet minimum purchase amount")
	ErrDiscountMinQuantity   = errors.New("order does not meet minimum quantity threshold")
)

// CalculateEffectiveUnitPrice returns Base sales price + variant extra
func CalculateEffectiveUnitPrice(product models.Product, variant *models.ProductVariant) int64 {
	price := product.SalesPrice
	if variant != nil {
		price += variant.PriceExtra
	}
	return price
}

// EvaluateDiscount computes discount amount (in cents) for order/line item
func EvaluateDiscount(rule *models.DiscountRule, totalQuantity int, subtotalCents int64, now time.Time) (int64, error) {
	if rule == nil {
		return 0, nil
	}

	if !rule.IsActive {
		return 0, ErrDiscountInactive
	}

	if rule.StartDate != nil && now.Before(*rule.StartDate) {
		return 0, ErrDiscountNotStarted
	}

	if rule.EndDate != nil && now.After(*rule.EndDate) {
		return 0, ErrDiscountExpired
	}

	if rule.MaxUses > 0 && rule.CurrentUses >= rule.MaxUses {
		return 0, ErrDiscountUsageExceeded
	}

	if rule.MinQuantity > 0 && totalQuantity < rule.MinQuantity {
		return 0, ErrDiscountMinQuantity
	}

	if rule.MinPurchaseAmount > 0 && subtotalCents < rule.MinPurchaseAmount {
		return 0, ErrDiscountMinSpend
	}

	var discountAmount int64
	switch rule.Type {
	case models.DiscountTypeFixed:
		discountAmount = int64(math.Round(rule.Value))
	case models.DiscountTypePercentage:
		discountAmount = int64(math.Round(float64(subtotalCents) * (rule.Value / 100.0)))
	default:
		discountAmount = 0
	}

	if discountAmount > subtotalCents {
		discountAmount = subtotalCents
	}

	return discountAmount, nil
}

// CalculateTax computes tax amount (in cents) for taxable amount given tax rules
func CalculateTax(taxableCents int64, taxRules []models.TaxRule) int64 {
	var totalTax int64
	for _, rule := range taxRules {
		if rule.IsActive && rule.RatePercentage > 0 {
			tax := int64(math.Round(float64(taxableCents) * (rule.RatePercentage / 100.0)))
			totalTax += tax
		}
	}
	return totalTax
}
