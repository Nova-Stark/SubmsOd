package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"submsod/internals/auth"
	"submsod/internals/database"
	"submsod/internals/server"

	"github.com/gin-gonic/gin"
)

func setupTestDB(t *testing.T) *gin.Engine {
	gin.SetMode(gin.TestMode)
	testDBPath := "data/test_brightloop.db"
	_ = os.Remove(testDBPath)

	database.InitDB(testDBPath)
	return server.NewRouter()
}

func TestPasswordRules(t *testing.T) {
	tests := []struct {
		password string
		valid    bool
	}{
		{"Short1!", false},          // <8 chars
		{"alllowercase1!", false},    // no upper
		{"ALLUPPERCASE1!", false},    // no lower
		{"NoSpecialChar123", false},  // no special
		{"ValidPass123!", true},      // valid
		{"Str0ng@Password#", true},   // valid
	}

	for _, tt := range tests {
		err := auth.ValidatePassword(tt.password)
		if (err == nil) != tt.valid {
			t.Errorf("ValidatePassword(%s) expected valid=%v, got err=%v", tt.password, tt.valid, err)
		}
	}
}

func TestAuthFlow(t *testing.T) {
	router := setupTestDB(t)
	defer os.Remove("data/test_brightloop.db")

	// 1. Signup Customer
	signupBody, _ := json.Marshal(map[string]string{
		"email":    "customer@example.com",
		"password": "Password123!",
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/api/v1/auth/signup", bytes.NewBuffer(signupBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201 on signup, got %d: %s", w.Code, w.Body.String())
	}

	var signupRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &signupRes)
	customerToken, ok := signupRes["token"].(string)
	if !ok || customerToken == "" {
		t.Fatalf("expected JWT token from signup")
	}

	// 2. Login Customer
	loginBody, _ := json.Marshal(map[string]string{
		"email":    "customer@example.com",
		"password": "Password123!",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(loginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 on login, got %d", w.Code)
	}

	// 3. Login Admin (seeded automatically)
	adminLoginBody, _ := json.Marshal(map[string]string{
		"email":    "admin@brightloop.local",
		"password": "Admin@Brightloop2026!",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/auth/login", bytes.NewBuffer(adminLoginBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 on admin login, got %d: %s", w.Code, w.Body.String())
	}

	var adminLoginRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &adminLoginRes)
	adminToken := adminLoginRes["token"].(string)

	// 4. Customer attempts to create Staff -> Forbidden 403
	staffBody, _ := json.Marshal(map[string]string{
		"email":    "staff@example.com",
		"password": "StaffPassword123!",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/admin/staff", bytes.NewBuffer(staffBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected customer to be blocked from creating staff (403), got %d", w.Code)
	}

	// 5. Admin creates Staff -> Created 201
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/admin/staff", bytes.NewBuffer(staffBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+adminToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected admin to create staff (201), got %d: %s", w.Code, w.Body.String())
	}

	// 6. Forgot Password & Reset Password
	forgotBody, _ := json.Marshal(map[string]string{
		"email": "customer@example.com",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/auth/forgot-password", bytes.NewBuffer(forgotBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	var forgotRes map[string]interface{}
	_ = json.Unmarshal(w.Body.Bytes(), &forgotRes)
	resetCode := forgotRes["reset_code"].(string)

	resetBody, _ := json.Marshal(map[string]string{
		"email":        "customer@example.com",
		"token_code":   resetCode,
		"new_password": "NewSecretPassword123!",
	})
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("POST", "/api/v1/auth/reset-password", bytes.NewBuffer(resetBody))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 on reset password, got %d: %s", w.Code, w.Body.String())
	}

	// 7. Delete Customer Account
	w = httptest.NewRecorder()
	req, _ = http.NewRequest("DELETE", "/api/v1/users/me", nil)
	req.Header.Set("Authorization", "Bearer "+customerToken)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 on delete me, got %d", w.Code)
	}
}
