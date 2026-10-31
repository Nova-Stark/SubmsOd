package server

import (
	"net/http"

	"submsod/internals/handlers"
	"submsod/internals/middleware"
	"submsod/internals/models"

	"github.com/gin-gonic/gin"
)

func NewRouter() *gin.Engine {
	r := gin.Default()

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Brightloop core API online",
		})
	})

	api := r.Group("/api/v1")
	{
		// Public Auth
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/signup", handlers.Signup)
			authGroup.POST("/login", handlers.Login)
			authGroup.POST("/forgot-password", handlers.ForgotPassword)
			authGroup.POST("/reset-password", handlers.ResetPassword)
		}

		// Authenticated Routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.DELETE("/users/me", handlers.DeleteMe)

			// Catalog Read (Staff, Admin, Customer)
			catalogGroup := protected.Group("/catalog")
			{
				catalogGroup.GET("/products", handlers.ListProducts)
				catalogGroup.GET("/plans", handlers.ListPlans)
				catalogGroup.GET("/discounts", handlers.ListDiscounts)
				catalogGroup.POST("/discounts/validate", handlers.ValidateDiscount)
				catalogGroup.GET("/taxes", handlers.ListTaxes)
			}

			// Subscriptions - Operations allowed for Customer (self-service) and Staff/Admin
			protected.GET("/subscriptions/:id", handlers.GetSubscription)
			protected.POST("/subscriptions/:id/confirm", handlers.ConfirmSubscription)
			protected.POST("/subscriptions/:id/pause", handlers.PauseSubscription)
			protected.POST("/subscriptions/:id/resume", handlers.ResumeSubscription)
			protected.POST("/subscriptions/:id/close", handlers.CloseSubscription)
			protected.POST("/subscriptions/:id/renew", handlers.RenewSubscription)

			// Invoices - Read and Print (Customer Owner or Staff/Admin)
			protected.GET("/invoices/:id", handlers.GetInvoice)
			protected.GET("/invoices/:id/print", handlers.PrintInvoiceHTML)

			// Customer Portal Routes
			portal := protected.Group("/portal")
			portal.Use(middleware.RequireRole(string(models.RoleCustomer), string(models.RoleAdmin), string(models.RoleStaff)))
			{
				portal.GET("/subscriptions", handlers.ListCustomerSubscriptions)
				portal.GET("/invoices", handlers.ListCustomerInvoices)
			}

			// Company Internal Routes (Staff & Admin Only)
			internal := protected.Group("")
			internal.Use(middleware.RequireRole(string(models.RoleAdmin), string(models.RoleStaff)))
			{
				// Subscriptions
				internal.GET("/quotation-templates", handlers.ListQuotationTemplates)
				internal.POST("/quotation-templates", handlers.CreateQuotationTemplate)
				internal.POST("/quotations/from-template", handlers.CreateDraftFromTemplate)

				internal.GET("/subscriptions", handlers.ListSubscriptions)
				internal.POST("/subscriptions", handlers.CreateSubscriptionDraft)
				internal.POST("/subscriptions/:id/send-quote", handlers.SendQuote)
				internal.POST("/subscriptions/:id/activate", handlers.ActivateSubscription)

				// Billing & Invoices
				internal.POST("/billing/run", handlers.TriggerBatchBilling)
				internal.GET("/invoices", handlers.ListInvoices)
				internal.POST("/invoices/:id/confirm", handlers.ConfirmInvoice)
				internal.POST("/invoices/:id/cancel", handlers.CancelInvoice)
				internal.POST("/invoices/:id/payments", handlers.LogPayment)

				// Finance Analytics & Ledger
				internal.GET("/finance/summary", handlers.GetFinanceSummary)
				internal.GET("/finance/reports", handlers.GetFinanceReports)
			}

			// Admin-only operations
			admin := protected.Group("/admin")
			admin.Use(middleware.RequireRole(string(models.RoleAdmin)))
			{
				admin.POST("/staff", handlers.CreateStaff)

				// Catalog Management
				admin.POST("/catalog/products", handlers.CreateProduct)
				admin.POST("/catalog/products/:id/variants", handlers.AddProductVariant)
				admin.POST("/catalog/plans", handlers.CreatePlan)
				admin.POST("/catalog/discounts", handlers.CreateDiscount)
				admin.POST("/catalog/taxes", handlers.CreateTax)
			}
		}
	}

	return r
}
