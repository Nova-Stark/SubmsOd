package billing

import (
	"errors"
	"fmt"
	"time"

	"submsod/internals/catalog"
	"submsod/internals/models"

	"gorm.io/gorm"
)

var (
	ErrInvoiceNotFound      = errors.New("invoice not found")
	ErrInvoiceNotConfirmed  = errors.New("cannot pay an invoice that is not confirmed")
	ErrInvoiceAlreadyPaid   = errors.New("invoice is already fully paid")
	ErrInvalidPaymentAmount = errors.New("payment amount must be greater than zero")
)

type BatchRunResult struct {
	TotalProcessed   int      `json:"total_processed"`
	InvoicesCreated  int      `json:"invoices_created"`
	InvoicesSkipped  int      `json:"invoices_skipped"` // already billed for cycle
	TotalBilledCents int64    `json:"total_billed_cents"`
	InvoiceIDs       []string `json:"invoice_ids"`
}

// ExecuteBatchBilling runs recurring invoice generation for all active due subscriptions
func ExecuteBatchBilling(db *gorm.DB, now time.Time) (BatchRunResult, error) {
	result := BatchRunResult{}

	// Fetch active subscriptions due for billing
	var subscriptions []models.Subscription
	err := db.Preload("Plan").
		Preload("Lines.Product").
		Preload("Lines.Variant").
		Preload("AppliedDiscount").
		Where("status = ? AND next_billing_date <= ?", models.StatusActive, now).
		Find(&subscriptions).Error
	if err != nil {
		return result, fmt.Errorf("failed to query due subscriptions: %w", err)
	}

	result.TotalProcessed = len(subscriptions)

	// Fetch active tax rules
	var activeTaxRules []models.TaxRule
	_ = db.Where("is_active = ?", true).Find(&activeTaxRules)

	for _, sub := range subscriptions {
		err := db.Transaction(func(tx *gorm.DB) error {
			periodStart := sub.NextBillingDate

			// Idempotency check: see if invoice already exists for this cycle
			var existing models.Invoice
			if err := tx.Where("subscription_id = ? AND billing_period_start = ?", sub.ID, periodStart).First(&existing).Error; err == nil {
				result.InvoicesSkipped++
				return nil
			}

			// Calculate cycle end
			var periodEnd time.Time
			var nextBilling time.Time
			if sub.Plan != nil && sub.Plan.BillingPeriod == models.BillingPeriodYearly {
				nextBilling = periodStart.AddDate(1, 0, 0)
				periodEnd = nextBilling.AddDate(0, 0, -1)
			} else {
				nextBilling = periodStart.AddDate(0, 1, 0)
				periodEnd = nextBilling.AddDate(0, 0, -1)
			}

			dueDate := periodStart.AddDate(0, 0, 30) // NET30 default

			var subtotal int64
			var totalQty int
			var invoiceLines []models.InvoiceLine

			for _, sl := range sub.Lines {
				prodName := "Product"
				if sl.Product != nil {
					prodName = sl.Product.Name
				}
				var variantName string
				if sl.Variant != nil {
					variantName = sl.Variant.VariantName
				}

				lineTotal := sl.UnitPrice * int64(sl.Quantity)
				subtotal += lineTotal
				totalQty += sl.Quantity

				invoiceLines = append(invoiceLines, models.InvoiceLine{
					ProductName: prodName,
					VariantName: variantName,
					Quantity:    sl.Quantity,
					UnitPrice:   sl.UnitPrice,
					TaxRate:     sl.TaxRate,
					LineTotal:   lineTotal,
				})
			}

			// Evaluate discount
			var discountAmount int64
			if sub.AppliedDiscount != nil {
				disc, err := catalog.EvaluateDiscount(sub.AppliedDiscount, totalQty, subtotal, now)
				if err == nil && disc > 0 {
					discountAmount = disc
					// Increment discount usage
					tx.Model(&models.DiscountRule{}).Where("id = ?", sub.AppliedDiscount.ID).
						Update("current_uses", gorm.Expr("current_uses + 1"))
				}
			}

			// Calculate taxes on taxable subtotal
			taxable := subtotal - discountAmount
			if taxable < 0 {
				taxable = 0
			}
			taxAmount := catalog.CalculateTax(taxable, activeTaxRules)
			totalAmount := taxable + taxAmount

			invoice := models.Invoice{
				SubscriptionID:     sub.ID,
				CustomerID:         sub.CustomerID,
				Status:             models.InvoiceStatusDraft,
				BillingPeriodStart: periodStart,
				BillingPeriodEnd:   periodEnd,
				DueDate:            dueDate,
				Subtotal:           subtotal,
				DiscountAmount:     discountAmount,
				TaxAmount:          taxAmount,
				TotalAmount:        totalAmount,
				AmountPaid:         0,
				Lines:              invoiceLines,
			}

			if err := tx.Create(&invoice).Error; err != nil {
				return fmt.Errorf("failed to create invoice: %w", err)
			}

			// Advance subscription dates
			updateData := map[string]interface{}{
				"last_billed_date":  periodStart,
				"next_billing_date": nextBilling,
			}

			// Auto-close check if plan has auto_close and reached expiry
			if sub.Plan != nil && sub.Plan.AutoClose && sub.ExpiryDate != nil && nextBilling.After(*sub.ExpiryDate) {
				updateData["status"] = models.StatusClosed
			}

			if err := tx.Model(&models.Subscription{}).Where("id = ?", sub.ID).Updates(updateData).Error; err != nil {
				return fmt.Errorf("failed to advance subscription billing date: %w", err)
			}

			result.InvoicesCreated++
			result.TotalBilledCents += totalAmount
			result.InvoiceIDs = append(result.InvoiceIDs, invoice.ID)
			return nil
		})

		if err != nil {
			return result, err
		}
	}

	return result, nil
}

// RecordPayment logs payment against invoice and updates settled balance
func RecordPayment(db *gorm.DB, invoiceID string, method models.PaymentMethod, amountCents int64, notes string, now time.Time) (*models.Payment, *models.Invoice, error) {
	if amountCents <= 0 {
		return nil, nil, ErrInvalidPaymentAmount
	}

	var payment models.Payment
	var invoice models.Invoice

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Preload("Lines").Where("id = ?", invoiceID).First(&invoice).Error; err != nil {
			return ErrInvoiceNotFound
		}

		if invoice.Status != models.InvoiceStatusConfirmed && invoice.Status != models.InvoiceStatusDraft {
			if invoice.Status == models.InvoiceStatusPaid {
				return ErrInvoiceAlreadyPaid
			}
			return ErrInvoiceNotConfirmed
		}

		payment = models.Payment{
			InvoiceID:     invoice.ID,
			PaymentMethod: method,
			Amount:        amountCents,
			PaymentDate:   now,
			Notes:         notes,
		}

		if err := tx.Create(&payment).Error; err != nil {
			return fmt.Errorf("failed to record payment: %w", err)
		}

		invoice.AmountPaid += amountCents
		if invoice.AmountPaid >= invoice.TotalAmount {
			invoice.Status = models.InvoiceStatusPaid
		} else if invoice.Status == models.InvoiceStatusDraft {
			invoice.Status = models.InvoiceStatusConfirmed
		}

		if err := tx.Save(&invoice).Error; err != nil {
			return fmt.Errorf("failed to update invoice balance: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, nil, err
	}

	return &payment, &invoice, nil
}
