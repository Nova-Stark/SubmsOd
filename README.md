# Brightloop Subscription Management System

Unified B2B Subscription, Billing, and Revenue Operations Platform built for SaaS and recurring-revenue businesses.

## Backend Core (Go + Gin + SQLite)

The complete backend engine is in [`core/`](file:///core):
- **Developer Guide & API Reference**: [`core/DEVELOPER_GUIDE.md`](file:///core/DEVELOPER_GUIDE.md)
- **Monolithic Engine**: Auth & RBAC, Catalog & Variants, Quotation & Subscription Lifecycle, Batch Billing, Payment Settlement, Finance Analytics.
- **Run Backend**: `cd core && go run ./cmd/main.go`
- **Run Tests**: `cd core && go test -v ./tests/...`
