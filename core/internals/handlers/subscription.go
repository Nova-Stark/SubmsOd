package handlers

import (
	"net/http"
	"strings"
	"time"

	"submsod/internals/catalog"
	"submsod/internals/database"
	"submsod/internals/models"
	"submsod/internals/subscription"

	"github.com/gin-gonic/gin"
)

// Quotation Template Handlers

type CreateTemplateRequest struct {
	Name         string                      `json:"name" binding:"required"`
	ValidityDays int                         `json:"validity_days"`
	Lines        []CreateTemplateLineRequest `json:"lines" binding:"required"`
}

type CreateTemplateLineRequest struct {
	ProductID string  `json:"product_id" binding:"required"`
	VariantID *string `json:"variant_id"`
	Quantity  int     `json:"quantity" binding:"required"`
}

func ListQuotationTemplates(c *gin.Context) {
	var templates []models.QuotationTemplate
	if err := database.DB.Preload("Lines.Product").Preload("Lines.Variant").Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query quotation templates"})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func CreateQuotationTemplate(c *gin.Context) {
	var req CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template input: " + err.Error()})
		return
	}

	validity := req.ValidityDays
	if validity <= 0 {
		validity = 30
	}

	template := models.QuotationTemplate{
		Name:         strings.TrimSpace(req.Name),
		ValidityDays: validity,
	}

	for _, l := range req.Lines {
		var product models.Product
		if err := database.DB.Where("id = ?", l.ProductID).First(&product).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Product not found: " + l.ProductID})
			return
		}

		var variant *models.ProductVariant
		if l.VariantID != nil && *l.VariantID != "" {
			var v models.ProductVariant
			if err := database.DB.Where("id = ? AND product_id = ?", *l.VariantID, product.ID).First(&v).Error; err == nil {
				variant = &v
			}
		}

		effectiveUnitPrice := catalog.CalculateEffectiveUnitPrice(product, variant)
		qty := l.Quantity
		if qty <= 0 {
			qty = 1
		}

		template.Lines = append(template.Lines, models.QuotationTemplateLine{
			ProductID: product.ID,
			VariantID: l.VariantID,
			Quantity:  qty,
			UnitPrice: effectiveUnitPrice,
		})
	}

	if err := database.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create template"})
		return
	}

	c.JSON(http.StatusCreated, template)
}

// Convert Template to Draft Subscription

type FromTemplateRequest struct {
	TemplateID        string     `json:"template_id" binding:"required"`
	CustomerID        string     `json:"customer_id" binding:"required"`
	PlanID            string     `json:"plan_id" binding:"required"`
	StartDate         *time.Time `json:"start_date"`
	ExpiryDate        *time.Time `json:"expiry_date"`
	PaymentTerms      string     `json:"payment_terms"`
	AppliedDiscountID *string    `json:"applied_discount_id"`
}

func CreateDraftFromTemplate(c *gin.Context) {
	var req FromTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "TemplateID, CustomerID, and PlanID are required"})
		return
	}

	var template models.QuotationTemplate
	if err := database.DB.Preload("Lines").Where("id = ?", req.TemplateID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quotation template not found"})
		return
	}

	var customer models.User
	if err := database.DB.Where("id = ?", req.CustomerID).First(&customer).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Customer not found"})
		return
	}

	var plan models.Plan
	if err := database.DB.Where("id = ?", req.PlanID).First(&plan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	startDate := time.Now()
	if req.StartDate != nil {
		startDate = *req.StartDate
	}

	paymentTerms := req.PaymentTerms
	if paymentTerms == "" {
		paymentTerms = "NET30"
	}

	sub := models.Subscription{
		CustomerID:        customer.ID,
		PlanID:            plan.ID,
		Status:            models.StatusDraft,
		StartDate:         startDate,
		ExpiryDate:        req.ExpiryDate,
		NextBillingDate:   startDate,
		PaymentTerms:      paymentTerms,
		AppliedDiscountID: req.AppliedDiscountID,
	}

	for _, l := range template.Lines {
		sub.Lines = append(sub.Lines, models.SubscriptionLine{
			ProductID: l.ProductID,
			VariantID: l.VariantID,
			Quantity:  l.Quantity,
			UnitPrice: l.UnitPrice,
			Subtotal:  l.UnitPrice * int64(l.Quantity),
		})
	}

	if err := database.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription draft from template"})
		return
	}

	c.JSON(http.StatusCreated, sub)
}

type ConvertTemplateRequest struct {
	CustomerID string     `json:"customer_id"`
	CustomerId string     `json:"customerId"`
	PlanID     string     `json:"plan_id"`
	PlanId     string     `json:"planId"`
	StartDate  *time.Time `json:"start_date"`
	StartDateC *time.Time `json:"startDate"`
}

// ConvertQuotationTemplate converts a template directly via URL param :id
func ConvertQuotationTemplate(c *gin.Context) {
	templateID := c.Param("id")

	var template models.QuotationTemplate
	if err := database.DB.Preload("Lines").Where("id = ?", templateID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Quotation template not found"})
		return
	}

	var req ConvertTemplateRequest
	_ = c.ShouldBindJSON(&req)

	cid := req.CustomerID
	if cid == "" {
		cid = req.CustomerId
	}

	var customer models.User
	if cid != "" {
		_ = database.DB.Where("id = ?", cid).First(&customer)
	}
	if customer.ID == "" {
		_ = database.DB.Where("role = ?", models.RoleCustomer).First(&customer)
	}

	pid := req.PlanID
	if pid == "" {
		pid = req.PlanId
	}
	var plan models.Plan
	if pid != "" {
		_ = database.DB.Where("id = ?", pid).First(&plan)
	}
	if plan.ID == "" {
		_ = database.DB.First(&plan)
	}

	startDate := time.Now()
	if req.StartDate != nil {
		startDate = *req.StartDate
	} else if req.StartDateC != nil {
		startDate = *req.StartDateC
	}

	sub := models.Subscription{
		CustomerID:      customer.ID,
		PlanID:          plan.ID,
		Status:          models.StatusDraft,
		StartDate:       startDate,
		NextBillingDate: startDate,
		PaymentTerms:    "NET30",
	}

	for _, l := range template.Lines {
		sub.Lines = append(sub.Lines, models.SubscriptionLine{
			ProductID: l.ProductID,
			VariantID: l.VariantID,
			Quantity:  l.Quantity,
			UnitPrice: l.UnitPrice,
			Subtotal:  l.UnitPrice * int64(l.Quantity),
		})
	}

	if err := database.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to convert template to subscription"})
		return
	}

	database.DB.Preload("Lines.Product").Preload("Plan").Preload("Customer").Where("id = ?", sub.ID).First(&sub)
	c.JSON(http.StatusCreated, sub)
}

// Custom Draft Subscription

type CreateSubscriptionRequest struct {
	CustomerID        string                        `json:"customer_id" binding:"required"`
	PlanID            string                        `json:"plan_id" binding:"required"`
	StartDate         *time.Time                    `json:"start_date"`
	ExpiryDate        *time.Time                    `json:"expiry_date"`
	PaymentTerms      string                        `json:"payment_terms"`
	AppliedDiscountID *string                       `json:"applied_discount_id"`
	Lines             []CreateSubscriptionLineInput `json:"lines" binding:"required"`
}

type CreateSubscriptionLineInput struct {
	ProductID string  `json:"product_id" binding:"required"`
	VariantID *string `json:"variant_id"`
	Quantity  int     `json:"quantity" binding:"required"`
	TaxRate   float64 `json:"tax_rate"`
}

func CreateSubscriptionDraft(c *gin.Context) {
	var req CreateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var plan models.Plan
	if err := database.DB.Where("id = ?", req.PlanID).First(&plan).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	startDate := time.Now()
	if req.StartDate != nil {
		startDate = *req.StartDate
	}

	paymentTerms := req.PaymentTerms
	if paymentTerms == "" {
		paymentTerms = "NET30"
	}

	sub := models.Subscription{
		CustomerID:        req.CustomerID,
		PlanID:            plan.ID,
		Status:            models.StatusDraft,
		StartDate:         startDate,
		ExpiryDate:        req.ExpiryDate,
		NextBillingDate:   startDate,
		PaymentTerms:      paymentTerms,
		AppliedDiscountID: req.AppliedDiscountID,
	}

	var totalQuantity int
	for _, l := range req.Lines {
		var product models.Product
		if err := database.DB.Where("id = ?", l.ProductID).First(&product).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Product not found: " + l.ProductID})
			return
		}

		var variant *models.ProductVariant
		if l.VariantID != nil && *l.VariantID != "" {
			var v models.ProductVariant
			if err := database.DB.Where("id = ? AND product_id = ?", *l.VariantID, product.ID).First(&v).Error; err == nil {
				variant = &v
			}
		}

		unitPrice := catalog.CalculateEffectiveUnitPrice(product, variant)
		qty := l.Quantity
		if qty <= 0 {
			qty = 1
		}
		totalQuantity += qty

		sub.Lines = append(sub.Lines, models.SubscriptionLine{
			ProductID: product.ID,
			VariantID: l.VariantID,
			Quantity:  qty,
			UnitPrice: unitPrice,
			TaxRate:   l.TaxRate,
			Subtotal:  unitPrice * int64(qty),
		})
	}

	if plan.MinQuantity > 0 && totalQuantity < plan.MinQuantity {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Total quantity does not meet plan minimum requirement"})
		return
	}

	if err := database.DB.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subscription draft"})
		return
	}

	c.JSON(http.StatusCreated, sub)
}

func ListSubscriptions(c *gin.Context) {
	status := c.Query("status")
	query := database.DB.Preload("Lines.Product").Preload("Lines.Variant").Preload("Plan").Preload("Customer")

	if status != "" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}

	var subs []models.Subscription
	if err := query.Find(&subs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query subscriptions"})
		return
	}
	c.JSON(http.StatusOK, subs)
}

func GetSubscription(c *gin.Context) {
	subID := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := database.DB.Preload("Lines.Product").Preload("Lines.Variant").Preload("Plan").Preload("Customer").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	// Customer can only view own subscription
	if userRole == string(models.RoleCustomer) && sub.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	c.JSON(http.StatusOK, sub)
}

// Lifecycle State Transition Endpoints

func SendQuote(c *gin.Context) {
	subID := c.Param("id")

	var sub models.Subscription
	if err := database.DB.Preload("Lines").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if err := subscription.TransitionToQuotation(&sub, 30, time.Now()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Quote sent successfully", "subscription": sub})
}

func ConfirmSubscription(c *gin.Context) {
	subID := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := database.DB.Preload("Lines").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if userRole == string(models.RoleCustomer) && sub.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := subscription.TransitionToConfirmed(&sub, time.Now()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription confirmed", "subscription": sub})
}

func ActivateSubscription(c *gin.Context) {
	subID := c.Param("id")

	var sub models.Subscription
	if err := database.DB.Preload("Lines").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if err := subscription.TransitionToActive(&sub, time.Now()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription activated", "subscription": sub})
}

func PauseSubscription(c *gin.Context) {
	subID := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := database.DB.Preload("Plan").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if userRole == string(models.RoleCustomer) && sub.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := subscription.TransitionToPaused(&sub, sub.Plan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription paused", "subscription": sub})
}

func ResumeSubscription(c *gin.Context) {
	subID := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := database.DB.Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if userRole == string(models.RoleCustomer) && sub.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if sub.Status != models.StatusPaused {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only paused subscriptions can be resumed"})
		return
	}

	sub.Status = models.StatusActive
	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription resumed to active", "subscription": sub})
}

func CloseSubscription(c *gin.Context) {
	subID := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := database.DB.Preload("Plan").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if userRole == string(models.RoleCustomer) && sub.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := subscription.TransitionToClosed(&sub, sub.Plan, time.Now()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription closed", "subscription": sub})
}

func RenewSubscription(c *gin.Context) {
	subID := c.Param("id")
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := database.DB.Preload("Plan").Where("id = ?", subID).First(&sub).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subscription not found"})
		return
	}

	if userRole == string(models.RoleCustomer) && sub.CustomerID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	if err := subscription.RenewSubscription(&sub, sub.Plan, time.Now()); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	database.DB.Save(&sub)
	c.JSON(http.StatusOK, gin.H{"message": "Subscription renewed", "subscription": sub})
}

// Customer Portal Endpoint

func ListCustomerSubscriptions(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var subs []models.Subscription
	if err := database.DB.Preload("Lines.Product").Preload("Lines.Variant").Preload("Plan").Where("customer_id = ?", userID).Find(&subs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query your subscriptions"})
		return
	}

	c.JSON(http.StatusOK, subs)
}
