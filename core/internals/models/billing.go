package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InvoiceStatus string

const (
	InvoiceStatusDraft     InvoiceStatus = "DRAFT"
	InvoiceStatusConfirmed InvoiceStatus = "CONFIRMED"
	InvoiceStatusPaid      InvoiceStatus = "PAID"
	InvoiceStatusCancelled InvoiceStatus = "CANCELLED"
)

type PaymentMethod string

const (
	PaymentMethodBankTransfer PaymentMethod = "BANK_TRANSFER"
	PaymentMethodCreditCard   PaymentMethod = "CREDIT_CARD"
	PaymentMethodCash         PaymentMethod = "CASH"
	PaymentMethodOther        PaymentMethod = "OTHER"
)

type Invoice struct {
	ID             string        `gorm:"primaryKey;size:36" json:"id"`
	InvoiceNumber  string        `gorm:"uniqueIndex;not null;size:50" json:"invoice_number"`
	SubscriptionID string        `gorm:"not null;size:36;uniqueIndex:idx_sub_billing_cycle" json:"subscription_id"`
	Subscription   *Subscription `gorm:"foreignKey:SubscriptionID" json:"subscription,omitempty"`
	CustomerID     string        `gorm:"not null;index;size:36" json:"customer_id"`
	Customer       *User         `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Status         InvoiceStatus `gorm:"not null;default:'DRAFT';size:20" json:"status"`

	BillingPeriodStart time.Time `gorm:"not null;uniqueIndex:idx_sub_billing_cycle" json:"billing_period_start"`
	BillingPeriodEnd   time.Time `gorm:"not null" json:"billing_period_end"`
	DueDate            time.Time `gorm:"not null;index" json:"due_date"`

	Subtotal       int64         `gorm:"not null" json:"subtotal"`        // cents
	DiscountAmount int64         `gorm:"default:0" json:"discount_amount"` // cents
	TaxAmount      int64         `gorm:"default:0" json:"tax_amount"`      // cents
	TotalAmount    int64         `gorm:"not null" json:"total_amount"`    // cents
	AmountPaid     int64         `gorm:"default:0" json:"amount_paid"`     // cents

	Lines    []InvoiceLine `gorm:"foreignKey:InvoiceID;constraint:OnDelete:CASCADE" json:"lines,omitempty"`
	Payments []Payment     `gorm:"foreignKey:InvoiceID;constraint:OnDelete:CASCADE" json:"payments,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (i *Invoice) BeforeCreate(tx *gorm.DB) error {
	if i.ID == "" {
		i.ID = uuid.NewString()
	}
	if i.InvoiceNumber == "" {
		i.InvoiceNumber = fmt.Sprintf("INV-%d-%s", time.Now().Year(), i.ID[:8])
	}
	return nil
}

type InvoiceLine struct {
	ID          string  `gorm:"primaryKey;size:36" json:"id"`
	InvoiceID   string  `gorm:"not null;index;size:36" json:"invoice_id"`
	ProductName string  `gorm:"not null;size:255" json:"product_name"`
	VariantName string  `gorm:"size:100" json:"variant_name,omitempty"`
	Quantity    int     `gorm:"not null" json:"quantity"`
	UnitPrice   int64   `gorm:"not null" json:"unit_price"` // cents
	TaxRate     float64 `gorm:"default:0" json:"tax_rate"`  // percentage
	LineTotal   int64   `gorm:"not null" json:"line_total"` // cents
}

func (il *InvoiceLine) BeforeCreate(tx *gorm.DB) error {
	if il.ID == "" {
		il.ID = uuid.NewString()
	}
	return nil
}

type Payment struct {
	ID            string        `gorm:"primaryKey;size:36" json:"id"`
	InvoiceID     string        `gorm:"not null;index;size:36" json:"invoice_id"`
	PaymentMethod PaymentMethod `gorm:"not null;size:50" json:"payment_method"`
	Amount        int64         `gorm:"not null" json:"amount"` // cents
	PaymentDate   time.Time     `gorm:"not null" json:"payment_date"`
	Notes         string        `json:"notes"`
	CreatedAt     time.Time     `json:"created_at"`
}

func (p *Payment) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}
