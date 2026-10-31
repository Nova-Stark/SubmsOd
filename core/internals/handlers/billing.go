package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"submsod/internals/billing"
	"submsod/internals/database"
	"submsod/internals/models"

	"github.com/gin-gonic/gin"
)

// TriggerBatchBilling runs recurring billing batch on demand
func TriggerBatchBilling(c *gin.Context) {
	result, err := billing.ExecuteBatchBilling(database.DB, time.Now())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Batch billing execution failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Batch billing executed successfully",
		"result":  result,
	})
}

// ListInvoices for Staff/Admin
func ListInvoices(c *gin.Context) {
	status := c.Query("status")
	customerID := c.Query("customer_id")

	query := database.DB.Preload("Lines").Preload("Payments").Preload("Customer")

	if status != "" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}
	if customerID != "" {
		query = query.Where("customer_id = ?", customerID)
	}

	var invoices []models.Invoice
	if err := query.Order("created_at desc").Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query invoices"})
		return
	}

	c.JSON(http.StatusOK, invoices)
}

// GetInvoice details
func GetInvoice(c *gin.Context) {
	id := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var invoice models.Invoice
	if err := database.DB.Preload("Lines").Preload("Payments").Preload("Customer").Where("id = ?", id).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	// Customer only sees own invoice
	if userRole == string(models.RoleCustomer) && invoice.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// ConfirmInvoice moves Draft -> Confirmed
func ConfirmInvoice(c *gin.Context) {
	id := c.Param("id")

	var invoice models.Invoice
	if err := database.DB.Where("id = ?", id).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	if invoice.Status != models.InvoiceStatusDraft {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only draft invoices can be confirmed"})
		return
	}

	invoice.Status = models.InvoiceStatusConfirmed
	database.DB.Save(&invoice)

	c.JSON(http.StatusOK, gin.H{"message": "Invoice confirmed successfully", "invoice": invoice})
}

// CancelInvoice marks invoice as Cancelled
func CancelInvoice(c *gin.Context) {
	id := c.Param("id")

	var invoice models.Invoice
	if err := database.DB.Where("id = ?", id).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	if invoice.Status == models.InvoiceStatusPaid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Paid invoices cannot be cancelled"})
		return
	}

	invoice.Status = models.InvoiceStatusCancelled
	database.DB.Save(&invoice)

	c.JSON(http.StatusOK, gin.H{"message": "Invoice cancelled", "invoice": invoice})
}

// PrintInvoiceHTML generates clean, print-ready HTML invoice
func PrintInvoiceHTML(c *gin.Context) {
	id := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var invoice models.Invoice
	if err := database.DB.Preload("Lines").Preload("Customer").Where("id = ?", id).First(&invoice).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	if userRole == string(models.RoleCustomer) && invoice.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	var linesHTML strings.Builder
	for _, l := range invoice.Lines {
		variant := ""
		if l.VariantName != "" {
			variant = fmt.Sprintf(" <span style='color:#666;'>(%s)</span>", l.VariantName)
		}
		linesHTML.WriteString(fmt.Sprintf(`
			<tr>
				<td style="padding: 10px; border-bottom: 1px solid #eee;">%s%s</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">%d</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$%.2f</td>
				<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$%.2f</td>
			</tr>
		`, l.ProductName, variant, l.Quantity, float64(l.UnitPrice)/100.0, float64(l.LineTotal)/100.0))
	}

	customerEmail := "Valued Customer"
	if invoice.Customer != nil {
		customerEmail = invoice.Customer.Email
	}

	html := fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Invoice %s - Brightloop</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #222; }
		.container { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 8px; }
		.header { display: flex; justify-content: space-between; border-bottom: 2px solid #3182ce; padding-bottom: 15px; }
		.logo { font-size: 24px; font-weight: bold; color: #2b6cb0; }
		.details { margin-top: 25px; display: flex; justify-content: space-between; }
		table { width: 100%%; border-collapse: collapse; margin-top: 30px; }
		th { background: #f7fafc; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e0; }
		.summary { margin-top: 25px; width: 300px; margin-left: auto; }
		.summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
		.total { font-weight: bold; font-size: 18px; border-top: 2px solid #2d3748; padding-top: 8px; }
		.badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px; }
		.badge-CONFIRMED { background: #feebc8; color: #7b341e; }
		.badge-PAID { background: #c6f6d5; color: #22543d; }
		.badge-DRAFT { background: #edf2f7; color: #4a5568; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<div>
				<div class="logo">Brightloop Software</div>
				<p style="color: #718096; margin-top: 4px;">Unified Recurring Billing Platform</p>
			</div>
			<div style="text-align: right;">
				<h2 style="margin: 0; color: #2d3748;">%s</h2>
				<span class="badge badge-%s">%s</span>
			</div>
		</div>

		<div class="details">
			<div>
				<strong>Billed To:</strong><br>
				%s
			</div>
			<div style="text-align: right;">
				<strong>Billing Period:</strong> %s to %s<br>
				<strong>Due Date:</strong> %s
			</div>
		</div>

		<table>
			<thead>
				<tr>
					<th>Description</th>
					<th style="text-align: center;">Qty</th>
					<th style="text-align: right;">Unit Price</th>
					<th style="text-align: right;">Amount</th>
				</tr>
			</thead>
			<tbody>
				%s
			</tbody>
		</table>

		<div class="summary">
			<div class="summary-row"><span>Subtotal:</span><span>$%.2f</span></div>
			<div class="summary-row"><span>Discounts:</span><span>-$%.2f</span></div>
			<div class="summary-row"><span>Taxes:</span><span>+$%.2f</span></div>
			<div class="summary-row total"><span>Total:</span><span>$%.2f</span></div>
			<div class="summary-row" style="color: #2b6cb0;"><span>Amount Paid:</span><span>$%.2f</span></div>
			<div class="summary-row" style="font-weight: 600; color: #c53030;"><span>Balance Due:</span><span>$%.2f</span></div>
		</div>
	</div>
</body>
</html>`,
		invoice.InvoiceNumber,
		invoice.InvoiceNumber,
		invoice.Status,
		invoice.Status,
		customerEmail,
		invoice.BillingPeriodStart.Format("2006-01-02"),
		invoice.BillingPeriodEnd.Format("2006-01-02"),
		invoice.DueDate.Format("2006-01-02"),
		linesHTML.String(),
		float64(invoice.Subtotal)/100.0,
		float64(invoice.DiscountAmount)/100.0,
		float64(invoice.TaxAmount)/100.0,
		float64(invoice.TotalAmount)/100.0,
		float64(invoice.AmountPaid)/100.0,
		float64(invoice.TotalAmount-invoice.AmountPaid)/100.0,
	)

	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(html))
}

// LogPayment records payment transaction against invoice
type LogPaymentRequest struct {
	PaymentMethod models.PaymentMethod `json:"payment_method" binding:"required"`
	Amount        int64                `json:"amount" binding:"required"` // cents
	Notes         string               `json:"notes"`
}

func LogPayment(c *gin.Context) {
	invoiceID := c.Param("id")

	var req LogPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "PaymentMethod and Amount are required"})
		return
	}

	payment, invoice, err := billing.RecordPayment(database.DB, invoiceID, req.PaymentMethod, req.Amount, req.Notes, time.Now())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Payment recorded successfully",
		"payment": payment,
		"invoice": gin.H{
			"id":          invoice.ID,
			"status":      invoice.Status,
			"amount_paid": invoice.AmountPaid,
			"balance_due": invoice.TotalAmount - invoice.AmountPaid,
		},
	})
}

// ListCustomerInvoices via portal
func ListCustomerInvoices(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var invoices []models.Invoice
	if err := database.DB.Preload("Lines").Preload("Payments").
		Where("customer_id = ?", userID).
		Order("created_at desc").
		Find(&invoices).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query invoices"})
		return
	}

	c.JSON(http.StatusOK, invoices)
}

// ListPayments returns recorded payment transactions
func ListPayments(c *gin.Context) {
	method := c.Query("method")
	query := database.DB.Preload("Invoice").Order("payment_date desc")
	if method != "" {
		query = query.Where("payment_method = ?", strings.ToUpper(method))
	}

	var payments []models.Payment
	if err := query.Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list payments"})
		return
	}

	c.JSON(http.StatusOK, payments)
}

// GenerateSubscriptionInvoice generates an invoice on demand for a subscription
func GenerateSubscriptionInvoice(c *gin.Context) {
	subID := c.Param("id")

	var sub models.Subscription
	if err := database.DB.Preload("Lines.Product").Preload("Lines.Variant").Preload("Plan").Preload("Customer").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	var inv models.Invoice
	now := time.Now()
	result, err := billing.ExecuteBatchBilling(database.DB, now.AddDate(0, 1, 0))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := database.DB.Preload("Lines").Preload("Customer").Where("subscription_id = ?", sub.ID).Order("created_at desc").First(&inv).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "Billing cycle run", "generated_count": result.InvoicesCreated})
		return
	}

	c.JSON(http.StatusOK, inv)
}
