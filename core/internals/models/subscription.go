package models

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionStatus string

const (
	StatusDraft     SubscriptionStatus = "DRAFT"
	StatusQuotation SubscriptionStatus = "QUOTATION"
	StatusConfirmed SubscriptionStatus = "CONFIRMED"
	StatusActive    SubscriptionStatus = "ACTIVE"
	StatusPaused    SubscriptionStatus = "PAUSED"
	StatusClosed    SubscriptionStatus = "CLOSED"
)

type QuotationTemplate struct {
	ID           string                  `gorm:"primaryKey;size:36" json:"id"`
	Name         string                  `gorm:"not null;size:255" json:"name"`
	ValidityDays int                     `gorm:"default:30" json:"validity_days"`
	Lines        []QuotationTemplateLine `gorm:"foreignKey:TemplateID;constraint:OnDelete:CASCADE" json:"lines,omitempty"`
	CreatedAt    time.Time               `json:"created_at"`
}

func (q *QuotationTemplate) BeforeCreate(tx *gorm.DB) error {
	if q.ID == "" {
		q.ID = uuid.NewString()
	}
	return nil
}

type QuotationTemplateLine struct {
	ID         string          `gorm:"primaryKey;size:36" json:"id"`
	TemplateID string          `gorm:"not null;index;size:36" json:"template_id"`
	ProductID  string          `gorm:"not null;size:36" json:"product_id"`
	Product    *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	VariantID  *string         `gorm:"size:36" json:"variant_id"`
	Variant    *ProductVariant `gorm:"foreignKey:VariantID" json:"variant,omitempty"`
	Quantity   int             `gorm:"default:1" json:"quantity"`
	UnitPrice  int64           `gorm:"not null" json:"unit_price"` // cents
}

func (ql *QuotationTemplateLine) BeforeCreate(tx *gorm.DB) error {
	if ql.ID == "" {
		ql.ID = uuid.NewString()
	}
	return nil
}

type Subscription struct {
	ID                 string             `gorm:"primaryKey;size:36" json:"id"`
	SubscriptionNumber string             `gorm:"uniqueIndex;not null;size:50" json:"subscription_number"`
	CustomerID         string             `gorm:"not null;index;size:36" json:"customer_id"`
	Customer           *User              `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	PlanID             string             `gorm:"not null;index;size:36" json:"plan_id"`
	Plan               *Plan              `gorm:"foreignKey:PlanID" json:"plan,omitempty"`
	Status             SubscriptionStatus `gorm:"not null;default:'DRAFT';size:20" json:"status"`

	StartDate       time.Time  `gorm:"not null" json:"start_date"`
	ExpiryDate      *time.Time `json:"expiry_date"`
	ValidUntil      *time.Time `json:"valid_until"` // quotation expiration
	NextBillingDate time.Time  `gorm:"not null;index" json:"next_billing_date"`
	LastBilledDate  *time.Time `json:"last_billed_date"`

	PaymentTerms      string             `gorm:"default:'NET30';size:50" json:"payment_terms"`
	AppliedDiscountID *string            `gorm:"size:36" json:"applied_discount_id"`
	AppliedDiscount   *DiscountRule      `gorm:"foreignKey:AppliedDiscountID" json:"applied_discount,omitempty"`
	Lines             []SubscriptionLine `gorm:"foreignKey:SubscriptionID;constraint:OnDelete:CASCADE" json:"lines,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (s *Subscription) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.NewString()
	}
	if s.SubscriptionNumber == "" {
		s.SubscriptionNumber = fmt.Sprintf("SUB-%d-%s", time.Now().Year(), s.ID[:8])
	}
	return nil
}

type SubscriptionLine struct {
	ID             string          `gorm:"primaryKey;size:36" json:"id"`
	SubscriptionID string          `gorm:"not null;index;size:36" json:"subscription_id"`
	ProductID      string          `gorm:"not null;size:36" json:"product_id"`
	Product        *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	VariantID      *string         `gorm:"size:36" json:"variant_id"`
	Variant        *ProductVariant `gorm:"foreignKey:VariantID" json:"variant,omitempty"`
	Quantity       int             `gorm:"not null" json:"quantity"`
	UnitPrice      int64           `gorm:"not null" json:"unit_price"` // cents
	TaxRate        float64         `gorm:"default:0" json:"tax_rate"`  // percentage
	Subtotal       int64           `gorm:"not null" json:"subtotal"`   // cents
}

func (sl *SubscriptionLine) BeforeCreate(tx *gorm.DB) error {
	if sl.ID == "" {
		sl.ID = uuid.NewString()
	}
	return nil
}
