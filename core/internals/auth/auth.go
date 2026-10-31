package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrPasswordTooShort = errors.New("password must be more than 8 characters")
	ErrPasswordNoUpper  = errors.New("password must contain at least 1 uppercase letter")
	ErrPasswordNoLower  = errors.New("password must contain at least 1 lowercase letter")
	ErrPasswordNoSpec   = errors.New("password must contain at least 1 special character")
	ErrInvalidEmail     = errors.New("invalid email address format")
	ErrDomainNoMX       = errors.New("email domain has no valid mail servers (MX record)")
	ErrInvalidToken     = errors.New("invalid or expired token")
)

var JWTSecretKey = []byte("brightloop-super-secret-jwt-key-2026")

type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// ValidatePassword checks: > 8 chars, 1 uppercase, 1 lowercase, 1 special char
func ValidatePassword(pass string) error {
	if len(pass) <= 8 {
		return ErrPasswordTooShort
	}

	var hasUpper, hasLower, hasSpecial bool
	for _, ch := range pass {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsPunct(ch) || unicode.IsSymbol(ch):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return ErrPasswordNoUpper
	}
	if !hasLower {
		return ErrPasswordNoLower
	}
	if !hasSpecial {
		return ErrPasswordNoSpec
	}

	return nil
}

// HashPassword hashes password using bcrypt
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares plaintext with bcrypt hash
func CheckPasswordHash(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// ValidateEmailFormatAndMX validates syntax and looks up MX record (bypasses test domains)
func ValidateEmailFormatAndMX(email string) error {
	addr, err := mail.ParseAddress(strings.TrimSpace(email))
	if err != nil {
		return ErrInvalidEmail
	}

	parts := strings.Split(addr.Address, "@")
	if len(parts) != 2 {
		return ErrInvalidEmail
	}

	domain := strings.ToLower(parts[1])

	// Bypass MX lookup for common testing/local environments
	if strings.HasSuffix(domain, ".test") ||
		strings.HasSuffix(domain, ".example") ||
		strings.HasSuffix(domain, ".local") ||
		domain == "localhost" ||
		domain == "example.com" {
		return nil
	}

	mxRecords, err := net.LookupMX(domain)
	if err != nil || len(mxRecords) == 0 {
		return ErrDomainNoMX
	}

	return nil
}

// GenerateJWT creates JWT token with 24-hour expiration
func GenerateJWT(userID, email, role string) (string, error) {
	claims := Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "brightloop-core",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecretKey)
}

// ParseJWT validates and extracts claims
func ParseJWT(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return JWTSecretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, ErrInvalidToken
}

// GenerateSecureToken creates cryptographically secure hex token for resets
func GenerateSecureToken(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
