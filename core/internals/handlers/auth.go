package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/models"

	"github.com/gin-gonic/gin"
)

type SignupRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required"`
}

type ResetPasswordRequest struct {
	Email       string `json:"email" binding:"required"`
	TokenCode   string `json:"token_code" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type CreateStaffRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input: email and password are required"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if err := auth.ValidateEmailFormatAndMX(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := auth.ValidatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Account with this email already exists"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: hash,
		Role:         models.RoleCustomer,
		IsVerified:   true,
		IsActive:     true,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	token, err := auth.GenerateJWT(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate session token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"token":   token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid credentials format"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "Account is disabled or deleted"})
		return
	}

	if !auth.CheckPasswordHash(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := auth.GenerateJWT(user.ID, user.Email, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to issue session token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

func ForgotPassword(c *gin.Context) {
	var req ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// Do not reveal email existence to prevent enumeration
		c.JSON(http.StatusOK, gin.H{"message": "If the account exists, a password reset link/code has been dispatched"})
		return
	}

	tokenCode, err := auth.GenerateSecureToken(16)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}

	resetToken := models.AuthToken{
		UserID:    user.ID,
		TokenCode: tokenCode,
		TokenType: models.TokenTypePasswordReset,
		ExpiresAt: time.Now().Add(15 * time.Minute),
		Used:      false,
	}

	if err := database.DB.Create(&resetToken).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record reset token"})
		return
	}

	// Simulated email dispatch (prints to log)
	log.Printf("[EMAIL NOTIFICATION] Reset link for %s: http://brightloop.local/reset-password?token=%s (Code: %s)", user.Email, tokenCode, tokenCode)

	c.JSON(http.StatusOK, gin.H{
		"message":    "If the account exists, a password reset link/code has been dispatched",
		"reset_code": tokenCode, // Provided for instant hackathon verification
	})
}

func ResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email, reset code, and new password are required"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if err := auth.ValidatePassword(req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request or token expired"})
		return
	}

	var token models.AuthToken
	err := database.DB.Where("user_id = ? AND token_code = ? AND token_type = ? AND used = ? AND expires_at > ?",
		user.ID, req.TokenCode, models.TokenTypePasswordReset, false, time.Now()).First(&token).Error
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash new password"})
		return
	}

	user.PasswordHash = newHash
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	token.Used = true
	database.DB.Save(&token)

	c.JSON(http.StatusOK, gin.H{"message": "Password successfully updated. You may now log in."})
}

func DeleteMe(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := database.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Soft delete / disable account
	user.IsActive = false
	database.DB.Save(&user)
	database.DB.Delete(&user)

	c.JSON(http.StatusOK, gin.H{"message": "User account successfully deleted"})
}

func CreateStaff(c *gin.Context) {
	var req CreateStaffRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email and password are required"})
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if err := auth.ValidateEmailFormatAndMX(req.Email); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := auth.ValidatePassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Account with this email already exists"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to secure password"})
		return
	}

	staff := models.User{
		Email:        req.Email,
		PasswordHash: hash,
		Role:         models.RoleStaff,
		IsVerified:   true,
		IsActive:     true,
	}

	if err := database.DB.Create(&staff).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create staff account"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Staff user successfully created",
		"user": gin.H{
			"id":    staff.ID,
			"email": staff.Email,
			"role":  staff.Role,
		},
	})
}
