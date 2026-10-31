package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductType string

const (
	ProductTypeSoftware ProductType = "SOFTWARE"
	ProductTypeAddon    ProductType = "ADDON"
	ProductTypeService  ProductType = "SERVICE"
)

type Product struct {
	ID         string           `gorm:"primaryKey;size:36" json:"id"`
	Name       string           `gorm:"not null;size:255" json:"name"`
	Type       ProductType      `gorm:"not null;size:50" json:"type"`
	SalesPrice int64            `gorm:"not null" json:"sales_price"` // stored in cents
	CostPrice  int64            `gorm:"not null" json:"cost_price"`  // stored in cents
	Notes      string           `json:"notes"`
	Variants   []ProductVariant `gorm:"foreignKey:ProductID;constraint:OnDelete:CASCADE" json:"variants,omitempty"`
	CreatedAt  time.Time        `json:"created_at"`
	UpdatedAt  time.Time        `json:"updated_at"`
}

func (p *Product) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.NewString()
	}
	return nil
}

type ProductVariant struct {
	ID          string    `gorm:"primaryKey;size:36" json:"id"`
	ProductID   string    `gorm:"not null;index;size:36" json:"product_id"`
	VariantName string    `gorm:"not null;size:100" json:"variant_name"`
	PriceExtra  int64     `gorm:"default:0" json:"price_extra"` // stored in cents
	CreatedAt   time.Time `json:"created_at"`
}

func (pv *ProductVariant) BeforeCreate(tx *gorm.DB) error {
	if pv.ID == "" {
		pv.ID = uuid.NewString()
	}
	return nil
}

type BillingPeriod string

const (
	BillingPeriodMonthly BillingPeriod = "MONTHLY"
	BillingPeriodYearly  BillingPeriod = "YEARLY"
)

type Plan struct {
	ID              string        `gorm:"primaryKey;size:36" json:"id"`
	Name            string        `gorm:"not null;size:255" json:"name"`
	BillingPeriod   BillingPeriod `gorm:"not null;size:20" json:"billing_period"`
	MinQuantity     int           `gorm:"default:1" json:"min_quantity"`
	StartDate       *time.Time    `json:"start_date"`
	EndDate         *time.Time    `json:"end_date"`
	AutoClose       bool          `gorm:"default:true" json:"auto_close"`
	AllowPause      bool          `gorm:"default:true" json:"allow_pause"`
	AllowEarlyClose bool          `gorm:"default:true" json:"allow_early_close"`
	AllowRenewal    bool          `gorm:"default:true" json:"allow_renewal"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
}

func (pl *Plan) BeforeCreate(tx *gorm.DB) error {
	if pl.ID == "" {
		pl.ID = uuid.NewString()
	}
	return nil
}

type DiscountType string

const (
	DiscountTypeFixed      DiscountType = "FIXED"
	DiscountTypePercentage DiscountType = "PERCENTAGE"
)

type DiscountRule struct {
	ID                string       `gorm:"primaryKey;size:36" json:"id"`
	Code              string       `gorm:"uniqueIndex;not null;size:50" json:"code"`
	Type              DiscountType `gorm:"not null;size:20" json:"type"`
	Value             float64      `gorm:"not null" json:"value"` // fixed cents (e.g. 5000) or percent (e.g. 15.0)
	MinQuantity       int          `gorm:"default:0" json:"min_quantity"`
	MinPurchaseAmount int64        `gorm:"default:0" json:"min_purchase_amount"` // cents
	StartDate         *time.Time   `json:"start_date"`
	EndDate           *time.Time   `json:"end_date"`
	MaxUses           int          `gorm:"default:0" json:"max_uses"` // 0 = unlimited
	CurrentUses       int          `gorm:"default:0" json:"current_uses"`
	ProductID         *string      `gorm:"size:36" json:"product_id"` // null = entire subscription
	IsActive          bool         `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time    `json:"created_at"`
}

func (d *DiscountRule) BeforeCreate(tx *gorm.DB) error {
	if d.ID == "" {
		d.ID = uuid.NewString()
	}
	return nil
}

type TaxRule struct {
	ID             string    `gorm:"primaryKey;size:36" json:"id"`
	Name           string    `gorm:"not null;size:100" json:"name"`
	RatePercentage float64   `gorm:"not null" json:"rate_percentage"` // e.g. 18.0
	IsActive       bool      `gorm:"default:true" json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
}

func (t *TaxRule) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
