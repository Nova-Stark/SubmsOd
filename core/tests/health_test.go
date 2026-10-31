package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"submsod/internals/server"
)

func TestHealthCheck(t *testing.T) {
	router := server.NewRouter()

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}
}
