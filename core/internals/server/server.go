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

			// Admin only routes
			admin := protected.Group("/admin")
			admin.Use(middleware.RequireRole(string(models.RoleAdmin)))
			{
				admin.POST("/staff", handlers.CreateStaff)
			}
		}
	}

	return r
}
