package handlers

import (
	"net/http"
	"strings"
	"time"

	"submsod/internals/catalog"
	"submsod/internals/database"
	"submsod/internals/models"

	"github.com/gin-gonic/gin"
)

// Product Handlers

type CreateProductRequest struct {
	Name       string                 `json:"name" binding:"required"`
	Type       models.ProductType     `json:"type" binding:"required"`
	SalesPrice int64                  `json:"sales_price" binding:"required"`
	CostPrice  int64                  `json:"cost_price" binding:"required"`
	Notes      string                 `json:"notes"`
	Variants   []CreateVariantRequest `json:"variants"`
}

type CreateVariantRequest struct {
	VariantName string `json:"variant_name" binding:"required"`
	PriceExtra  int64  `json:"price_extra"`
}

func ListProducts(c *gin.Context) {
	var products []models.Product
	if err := database.DB.Preload("Variants").Find(&products).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query products"})
		return
	}
	c.JSON(http.StatusOK, products)
}

func CreateProduct(c *gin.Context) {
	var req CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product input: " + err.Error()})
		return
	}

	product := models.Product{
		Name:       strings.TrimSpace(req.Name),
		Type:       req.Type,
		SalesPrice: req.SalesPrice,
		CostPrice:  req.CostPrice,
		Notes:      req.Notes,
	}

	for _, v := range req.Variants {
		product.Variants = append(product.Variants, models.ProductVariant{
			VariantName: strings.TrimSpace(v.VariantName),
			PriceExtra:  v.PriceExtra,
		})
	}

	if err := database.DB.Create(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, product)
}

func AddProductVariant(c *gin.Context) {
	productID := c.Param("id")

	var product models.Product
	if err := database.DB.Where("id = ?", productID).First(&product).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	var req CreateVariantRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid variant input: " + err.Error()})
		return
	}

	variant := models.ProductVariant{
		ProductID:   product.ID,
		VariantName: strings.TrimSpace(req.VariantName),
		PriceExtra:  req.PriceExtra,
	}

	if err := database.DB.Create(&variant).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create variant"})
		return
	}

	c.JSON(http.StatusCreated, variant)
}

// Plan Handlers

type CreatePlanRequest struct {
	Name            string               `json:"name" binding:"required"`
	BillingPeriod   models.BillingPeriod `json:"billing_period" binding:"required"`
	MinQuantity     int                  `json:"min_quantity"`
	StartDate       *time.Time           `json:"start_date"`
	EndDate         *time.Time           `json:"end_date"`
	AutoClose       *bool                `json:"auto_close"`
	AllowPause      *bool                `json:"allow_pause"`
	AllowEarlyClose *bool                `json:"allow_early_close"`
	AllowRenewal    *bool                `json:"allow_renewal"`
}

func ListPlans(c *gin.Context) {
	var plans []models.Plan
	if err := database.DB.Find(&plans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query plans"})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func CreatePlan(c *gin.Context) {
	var req CreatePlanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan input: " + err.Error()})
		return
	}

	minQty := req.MinQuantity
	if minQty <= 0 {
		minQty = 1
	}

	plan := models.Plan{
		Name:            strings.TrimSpace(req.Name),
		BillingPeriod:   req.BillingPeriod,
		MinQuantity:     minQty,
		StartDate:       req.StartDate,
		EndDate:         req.EndDate,
		AutoClose:       req.AutoClose == nil || *req.AutoClose,
		AllowPause:      req.AllowPause == nil || *req.AllowPause,
		AllowEarlyClose: req.AllowEarlyClose == nil || *req.AllowEarlyClose,
		AllowRenewal:    req.AllowRenewal == nil || *req.AllowRenewal,
	}

	if err := database.DB.Create(&plan).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create plan"})
		return
	}

	c.JSON(http.StatusCreated, plan)
}

// Discount Handlers

type CreateDiscountRequest struct {
	Code              string              `json:"code" binding:"required"`
	Type              models.DiscountType `json:"type" binding:"required"`
	Value             float64             `json:"value" binding:"required"`
	MinQuantity       int                 `json:"min_quantity"`
	MinPurchaseAmount int64               `json:"min_purchase_amount"`
	StartDate         *time.Time          `json:"start_date"`
	EndDate           *time.Time          `json:"end_date"`
	MaxUses           int                 `json:"max_uses"`
	ProductID         *string             `json:"product_id"`
}

type ValidateDiscountRequest struct {
	Code          string `json:"code" binding:"required"`
	TotalQuantity int    `json:"total_quantity"`
	SubtotalCents int64  `json:"subtotal_cents"`
}

func ListDiscounts(c *gin.Context) {
	var discounts []models.DiscountRule
	if err := database.DB.Find(&discounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query discounts"})
		return
	}
	c.JSON(http.StatusOK, discounts)
}

func CreateDiscount(c *gin.Context) {
	var req CreateDiscountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid discount input: " + err.Error()})
		return
	}

	discount := models.DiscountRule{
		Code:              strings.ToUpper(strings.TrimSpace(req.Code)),
		Type:              req.Type,
		Value:             req.Value,
		MinQuantity:       req.MinQuantity,
		MinPurchaseAmount: req.MinPurchaseAmount,
		StartDate:         req.StartDate,
		EndDate:           req.EndDate,
		MaxUses:           req.MaxUses,
		ProductID:         req.ProductID,
		IsActive:          true,
	}

	if err := database.DB.Create(&discount).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Discount code already exists or invalid"})
		return
	}

	c.JSON(http.StatusCreated, discount)
}

func ValidateDiscount(c *gin.Context) {
	var req ValidateDiscountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Code, total_quantity, and subtotal_cents are required"})
		return
	}

	var rule models.DiscountRule
	if err := database.DB.Where("code = ?", strings.ToUpper(strings.TrimSpace(req.Code))).First(&rule).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Discount code not found"})
		return
	}

	amount, err := catalog.EvaluateDiscount(&rule, req.TotalQuantity, req.SubtotalCents, time.Now())
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"valid": false, "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":           true,
		"code":            rule.Code,
		"discount_cents":  amount,
		"type":            rule.Type,
		"original_amount": req.SubtotalCents,
		"final_amount":    req.SubtotalCents - amount,
	})
}

// Tax Handlers

type CreateTaxRequest struct {
	Name           string  `json:"name" binding:"required"`
	RatePercentage float64 `json:"rate_percentage" binding:"required"`
}

func ListTaxes(c *gin.Context) {
	var taxes []models.TaxRule
	if err := database.DB.Find(&taxes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query taxes"})
		return
	}
	c.JSON(http.StatusOK, taxes)
}

func CreateTax(c *gin.Context) {
	var req CreateTaxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tax input: " + err.Error()})
		return
	}

	tax := models.TaxRule{
		Name:           strings.TrimSpace(req.Name),
		RatePercentage: req.RatePercentage,
		IsActive:       true,
	}

	if err := database.DB.Create(&tax).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create tax rule"})
		return
	}

	c.JSON(http.StatusCreated, tax)
}
