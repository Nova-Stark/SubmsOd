# Brightloop Core Services Developer Guide

Fast-reference manual for frontend, QA, and backend teammates integrating with the Brightloop Go + Gin monolithic backend.

---

## 1. Quick Start

### Prerequisites
- Go 1.22+ or 1.26
- No Docker, CGO, or external database required (runs zero-dependency SQLite in-process).

### Run Server
```bash
cd core
go run ./cmd/main.go
```
- Server starts on `http://localhost:8080`
- Database automatically created and migrated at `core/data/brightloop.db`
- Default admin is auto-seeded on first run:
  - **Email**: `admin@brightloop.local`
  - **Password**: `Admin@Brightloop2026!`

### Run Tests
```bash
cd core
go test -v ./tests/...          # Fast suite (<1.5s)
go test -race ./tests/...       # Race detector verification
```

---

## 2. Architecture & Directory Map

```
core/
├── cmd/
│   └── main.go                 # Application entrypoint
├── data/
│   └── brightloop.db           # SQLite database file (WAL mode enabled)
├── internals/
│   ├── auth/                   # JWT, bcrypt, password validators, MX checks
│   ├── catalog/                # Pricing, discount engine, tax calculator
│   ├── subscription/           # State engine & quotation transitions
│   ├── billing/                # Recurring batch billing & payment ledger
│   ├── finance/                # High-speed KPI aggregations & reports (<2s)
│   ├── database/
│   │   ├── db.go               # GORM SQLite connection & WAL tuning
│   │   └── migrations/         # Raw SQL DDL schema files (001 to 005)
│   ├── handlers/               # Gin REST HTTP handlers
│   ├── middleware/             # Auth & RBAC role guards
│   ├── models/                 # GORM struct definitions
│   └── server/
│       └── server.go           # Gin engine & route table
└── tests/                      # Integration, stress & edge-case test suites
```

---

## 3. Authentication & RBAC

Every protected endpoint requires an `Authorization: Bearer <JWT_TOKEN>` header.

### Roles
- `ADMIN`: Full system control (staff creation, catalog setup, finance reports).
- `STAFF`: Day-to-day sales, quotes, subscriptions, billing runs, payments.
- `CUSTOMER`: Portal access only to own subscriptions and invoices.

### Endpoints
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/signup` | POST | Public | Register customer (`email`, `password`) |
| `/api/v1/auth/login` | POST | Public | Authenticate and obtain JWT token |
| `/api/v1/auth/forgot-password`| POST | Public | Request password reset token |
| `/api/v1/auth/reset-password` | POST | Public | Submit reset token + new password |
| `/api/v1/users/me` | DELETE | Any Auth | Soft-delete own account |
| `/api/v1/admin/staff` | POST | `ADMIN` | Create internal staff account |

*Password Policy*: >8 characters, at least 1 uppercase, 1 lowercase, 1 special character.

---

## 4. Product Catalog & Pricing

Monetary values are stored in **integer cents** (e.g., $100.00 = `10000`).

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/catalog/products` | GET | Auth | List products with variants |
| `/api/v1/admin/catalog/products` | POST | `ADMIN` | Create base product (`sales_price`, `cost_price`) |
| `/api/v1/admin/catalog/products/:id/variants` | POST | `ADMIN` | Add variant (e.g. "Brand: Odoo", `price_extra: 56000`) |
| `/api/v1/catalog/plans` | GET | Auth | List billing plans |
| `/api/v1/admin/catalog/plans` | POST | `ADMIN` | Create plan (`MONTHLY` / `YEARLY`, lifecycle flags) |
| `/api/v1/catalog/discounts` | GET | Auth | List discount rules |
| `/api/v1/admin/catalog/discounts` | POST | `ADMIN` | Create discount rule (`FIXED` or `PERCENTAGE`) |
| `/api/v1/catalog/discounts/validate` | POST | Auth | Evaluate discount eligibility for checkout |
| `/api/v1/catalog/taxes` | GET | Auth | List active tax rules |
| `/api/v1/admin/catalog/taxes` | POST | `ADMIN` | Create tax rule (`rate_percentage: 18.0`) |

---

## 5. Quotation & Subscription Lifecycle

### State Machine Flow
$$\text{Draft} \longrightarrow \text{Quotation} \longrightarrow \text{Confirmed} \longrightarrow \text{Active} \longrightarrow \text{Closed}$$
*(Sub-state: `PAUSED` allowed if plan permits)*

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/quotation-templates` | GET / POST | `STAFF`, `ADMIN` | Pre-configured deal bundles |
| `/api/v1/quotations/from-template` | POST | `STAFF`, `ADMIN` | Convert template into Draft subscription |
| `/api/v1/subscriptions` | GET / POST | `STAFF`, `ADMIN` | List all subs or create custom Draft |
| `/api/v1/subscriptions/:id` | GET | Internal / Owner | View subscription details |
| `/api/v1/subscriptions/:id/send-quote` | POST | `STAFF`, `ADMIN` | Move `DRAFT` $\rightarrow$ `QUOTATION` |
| `/api/v1/subscriptions/:id/confirm` | POST | Internal / Owner | Move `QUOTATION` $\rightarrow$ `CONFIRMED` |
| `/api/v1/subscriptions/:id/activate` | POST | `STAFF`, `ADMIN` | Move `CONFIRMED` $\rightarrow$ `ACTIVE` |
| `/api/v1/subscriptions/:id/pause` | POST | Internal / Owner | Pause active billing |
| `/api/v1/subscriptions/:id/resume` | POST | Internal / Owner | Resume paused billing |
| `/api/v1/subscriptions/:id/close` | POST | Internal / Owner | Terminate subscription |
| `/api/v1/subscriptions/:id/renew` | POST | Internal / Owner | Extend subscription cycle |
| `/api/v1/portal/subscriptions` | GET | `CUSTOMER` | Customer portal view of own subs |

---

## 6. Billing Engine & Payment Ledger

### Automated Batch Invoicing
`POST /api/v1/billing/run` (Staff/Admin):
- Scans all `ACTIVE` subscriptions where `next_billing_date <= today`.
- Applies line item pricing, variants, dynamic discounts, and tax rates.
- Generates `Invoice` (`DRAFT`).
- **Idempotent**: Protected by composite index on `(subscription_id, billing_period_start)`. Safe to run multiple times without duplicate invoices.
- Advances subscription `next_billing_date` (+1 month or +1 year).

### Invoices & Payments API
| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/invoices` | GET | `STAFF`, `ADMIN` | List all invoices (filters: `status`, `customer_id`) |
| `/api/v1/invoices/:id` | GET | Internal / Owner | View invoice line items & payment history |
| `/api/v1/invoices/:id/confirm` | POST | `STAFF`, `ADMIN` | Publish invoice (`DRAFT` $\rightarrow$ `CONFIRMED`) |
| `/api/v1/invoices/:id/cancel` | POST | `STAFF`, `ADMIN` | Void invoice |
| `/api/v1/invoices/:id/print` | GET | Internal / Owner | Browser printable HTML invoice view |
| `/api/v1/invoices/:id/payments`| POST | `STAFF`, `ADMIN` | Log payment against invoice |
| `/api/v1/portal/invoices` | GET | `CUSTOMER` | Customer portal view of own invoices |

#### Payment Logging Payload
```json
{
  "payment_method": "CREDIT_CARD",
  "amount": 30000,
  "notes": "Upfront deposit"
}
```
*Note*: When cumulative `amount_paid >= total_amount`, invoice automatically updates to `PAID`.

---

## 7. Finance Analytics & KPIs

Strictly reserved for company internals (`ADMIN` and `STAFF`). Customer access returns `403 Forbidden`.

### 1. KPI Summary (`GET /api/v1/finance/summary`)
Response:
```json
{
  "summary": {
    "active_subscriptions": 25,
    "total_revenue_collected": 15400.00,
    "total_revenue_cents": 1540000,
    "outstanding_ar": 3200.00,
    "outstanding_ar_cents": 320000,
    "overdue_invoices_count": 2,
    "overdue_amount": 1200.00,
    "overdue_amount_cents": 120000
  },
  "execution_time_ms": 1
}
```

### 2. Paginated Reports & Ledger (`GET /api/v1/finance/reports`)
**Query Parameters**:
- `status`: `DRAFT`, `CONFIRMED`, `PAID`, `OVERDUE`
- `customer_id`: Filter by customer UUID
- `date_from`, `date_to`: `YYYY-MM-DD`
- `limit`, `offset`: Pagination controls
