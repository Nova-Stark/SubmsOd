package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin    Role = "ADMIN"
	RoleStaff    Role = "STAFF"
	RoleCustomer Role = "CUSTOMER"
)

type User struct {
	ID           string         `gorm:"primaryKey;size:36" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string         `gorm:"not null;size:255" json:"-"`
	Role         Role           `gorm:"not null;default:'CUSTOMER';size:20" json:"role"`
	IsVerified   bool           `gorm:"default:false" json:"is_verified"`
	IsActive     bool           `gorm:"default:true" json:"is_active"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.NewString()
	}
	return nil
}

type TokenType string

const (
	TokenTypePasswordReset TokenType = "PASSWORD_RESET"
	TokenTypeEmailVerify   TokenType = "EMAIL_VERIFY"
)

type AuthToken struct {
	ID        string    `gorm:"primaryKey;size:36" json:"id"`
	UserID    string    `gorm:"not null;index;size:36" json:"user_id"`
	TokenCode string    `gorm:"not null;index;size:64" json:"token_code"`
	TokenType TokenType `gorm:"not null;size:20" json:"token_type"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	Used      bool      `gorm:"default:false" json:"used"`
	CreatedAt time.Time `json:"created_at"`
}

func (t *AuthToken) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.NewString()
	}
	return nil
}
