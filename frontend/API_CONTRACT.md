# Brightloop Platform — Backend API Specification Contract
**Product:** Unified B2B Subscription, Billing & Revenue Operations Platform  
**Target Backend:** Monolithic Go + Gin + SQLite/Postgres (`core/`)  
**Frontend Consumer:** Developer 2 (Frontend & Role-Based UI)

---

## 1. Global Standards & Conventions

### 1.1 Base URL
All API endpoints are prefixed with `/api/v1`.

### 1.2 Authentication & Security
- **Cookie-First Model (Recommended):** The API sets an `httpOnly`, `SameSite=Lax`, `Secure` cookie containing the JWT session. All frontend requests pass `withCredentials: true`.
- **Bearer Token Fallback:** The API also returns `{ "token": "<jwt>" }` upon login/signup. If cookies are disabled or cross-domain, the client sends `Authorization: Bearer <token>`.
- Client toggle: configured via `VITE_AUTH_STORAGE=cookie` or `VITE_AUTH_STORAGE=localStorage`.

### 1.3 Standard Response Formats

#### Paginated List Response (`PaginatedResponse<T>`)
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

#### Standard Error Response (`ApiError`)
Status Codes: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `500 Server Error`.
```json
{
  "code": "VALIDATION_FAILED",
  "message": "The provided input contains invalid fields.",
  "fieldErrors": {
    "email": "Email must be a valid business domain address.",
    "password": "Password must be at least 9 characters with uppercase, lowercase, and special characters."
  }
}
```

### 1.4 Currency & Number Storage
- Monetary values are stored as integers in **cents / paise** (e.g. `₹560.00` is represented as `56000`).
- The frontend formats all currency values dynamically using the `en-IN` locale (`₹` symbol).

---

## 2. Authentication & User Management

### 2.1 Customer Registration
- **`POST /api/v1/auth/signup`**
  - **Access:** Public
  - **Rule:** Signup **never** accepts a `role` parameter. All signups create a `CUSTOMER` account.
  - **Request Body:**
    ```json
    {
      "email": "sarah@acme.inc",
      "password": "SecurePassword123!"
    }
    ```
  - **Response (`201 Created`):**
    ```json
    {
      "message": "User registered successfully",
      "token": "eyJhbGciOi...",
      "user": {
        "id": "usr_991823",
        "email": "sarah@acme.inc",
        "role": "CUSTOMER",
        "is_active": true
      }
    }
    ```

### 2.2 User Login
- **`POST /api/v1/auth/login`**
  - **Access:** Public
  - **Request Body:**
    ```json
    {
      "email": "admin@brightloop.io",
      "password": "AdminPassword123!"
    }
    ```
  - **Response (`200 OK`):**
    ```json
    {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "usr_1001",
        "email": "admin@brightloop.io",
        "role": "ADMIN",
        "is_active": true
      }
    }
    ```

### 2.3 Forgot Password
- **`POST /api/v1/auth/forgot-password`**
  - **Access:** Public
  - **Request Body:** `{ "email": "user@example.com" }`
  - **Response (`200 OK`):** `{ "message": "If the account exists, a password reset link/code has been dispatched" }`

### 2.4 Reset Password
- **`POST /api/v1/auth/reset-password`**
  - **Access:** Public
  - **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "token_code": "a91fcb7e...",
      "new_password": "NewSecurePassword123!"
    }
    ```
  - **Response (`200 OK`):** `{ "message": "Password successfully updated. You may now log in." }`

### 2.5 Staff Creation (Admin Only)
- **`POST /api/v1/admin/staff`**
  - **Access:** `ADMIN` role only
  - **Request Body:**
    ```json
    {
      "email": "john.ops@brightloop.io",
      "password": "StaffPassword123!"
    }
    ```
  - **Response (`201 Created`):**
    ```json
    {
      "message": "Staff user successfully created",
      "user": {
        "id": "usr_2004",
        "email": "john.ops@brightloop.io",
        "role": "STAFF",
        "is_active": true
      }
    }
    ```

---

## 3. Customer Directory & CRM Picker

### 3.1 List Customers
- **`GET /api/v1/customers`**
  - **Access:** `STAFF`, `ADMIN`
  - **Query Params:** `search`, `page`, `limit`
  - **Response (`200 OK`):**
    ```json
    {
      "data": [
        {
          "id": "cust_101",
          "name": "Acme Corp",
          "email": "billing@acme.com",
          "phone": "+91 9876543210",
          "company": "Acme Technologies Pvt Ltd",
          "gstin": "32AAAAA0000A1Z5",
          "activeSubscriptionsCount": 2,
          "createdAt": "2026-01-15T10:00:00Z"
        }
      ],
      "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
    }
    ```

### 3.2 Create Customer
- **`POST /api/v1/customers`**
  - **Access:** `STAFF`, `ADMIN`
  - **Request Body:** `{ "name": "Global Logistics", "email": "finance@globallog.com", "phone": "+91 9998887776", "gstin": "32BBBBB1111B2Z6" }`

---

## 4. Product Catalog & Variants

### 4.1 List Products
- **`GET /api/v1/catalog/products`**
  - **Access:** `CUSTOMER`, `STAFF`, `ADMIN`
  - **Response (`200 OK`):**
    ```json
    [
      {
        "id": "prod_1",
        "name": "ERP Core Platform",
        "type": "SOFTWARE",
        "sales_price": 499900,
        "cost_price": 200000,
        "notes": "Base subscription for enterprise resource planning",
        "variants": [
          {
            "id": "var_1",
            "product_id": "prod_1",
            "variant_name": "Brand: Standard",
            "price_extra": 0
          },
          {
            "id": "var_2",
            "product_id": "prod_1",
            "variant_name": "Brand: Odoo Enterprise",
            "price_extra": 56000
          }
        ]
      }
    ]
    ```

### 4.2 Create Product (Admin Only)
- **`POST /api/v1/admin/catalog/products`**
  - **Access:** `ADMIN`
  - **Request Body:**
    ```json
    {
      "name": "Cloud Storage Add-on",
      "type": "ADDON",
      "sales_price": 99900,
      "cost_price": 40000,
      "notes": "1TB storage tier",
      "variants": [
        { "variant_name": "Tier: Standard", "price_extra": 0 },
        { "variant_name": "Tier: High IOPS", "price_extra": 35000 }
      ]
    }
    ```

---

## 5. Subscription Plans & Rules

### 5.1 List Plans
- **`GET /api/v1/catalog/plans`**
  - **Access:** `CUSTOMER`, `STAFF`, `ADMIN`
  - **Response (`200 OK`):**
    ```json
    [
      {
        "id": "plan_1",
        "name": "Enterprise Monthly",
        "price": 1200000,
        "billing_period": "MONTHLY",
        "min_qty": 1,
        "start_date": "2026-01-01",
        "end_date": null,
        "flags": {
          "allowPause": true,
          "allowRenew": true,
          "allowEarlyClose": true,
          "autoCloseOnEnd": false
        },
        "allowedActions": ["pause", "renew", "close"]
      }
    ]
    ```

### 5.2 Create Plan (Admin Only)
- **`POST /api/v1/admin/catalog/plans`**
  - **Access:** `ADMIN`
  - **Request Body:**
    ```json
    {
      "name": "Startup Annual Plan",
      "price": 9900000,
      "billing_period": "YEARLY",
      "min_qty": 5,
      "start_date": "2026-01-01",
      "end_date": "2027-12-31",
      "flags": {
        "allowPause": false,
        "allowRenew": true,
        "allowEarlyClose": false,
        "autoCloseOnEnd": true
      }
    }
    ```

---

## 6. Quotation Templates & Conversion

### 6.1 List Quotation Templates
- **`GET /api/v1/quotation-templates`**
  - **Access:** `STAFF`, `ADMIN`
  - **Response:**
    ```json
    [
      {
        "id": "qtmpl_01",
        "name": "SaaS Growth Bundle (30-day Quote)",
        "validity_days": 30,
        "plan_id": "plan_1",
        "lines": [
          { "product_id": "prod_1", "variant_id": "var_2", "qty": 10, "unit_price": 555900 }
        ]
      }
    ]
    ```

### 6.2 Convert Template to Subscription
- **`POST /api/v1/quotation-templates/:id/convert`**
  - **Access:** `STAFF`, `ADMIN`
  - **Request Body:** `{ "customer_id": "cust_101", "start_date": "2026-11-01" }`
  - **Response (`201 Created`):** Returns the pre-populated `Subscription` object in `Draft` or `Quotation` state.

---

## 7. Subscriptions (Automated State Engine)

**Lifecycle:** `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed` (plus `Paused`)

### 7.1 List Subscriptions
- **`GET /api/v1/subscriptions`**
  - **Access:** `CUSTOMER` (filtered to own), `STAFF`, `ADMIN`
  - **Query Params:** `status`, `customerId`, `page`, `limit`, `search`
  - **Response (`200 OK`):**
    ```json
    {
      "data": [
        {
          "id": "sub_1001",
          "subscription_number": "SUB/2026/00142",
          "customer_id": "cust_101",
          "customer_name": "Acme Corp",
          "plan_id": "plan_1",
          "plan_name": "Enterprise Monthly",
          "status": "ACTIVE",
          "start_date": "2026-02-01",
          "expiry_date": "2027-01-31",
          "payment_terms": "Immediate",
          "currency": "INR",
          "subtotal": 5559000,
          "tax_total": 99982,
          "discount_total": 0,
          "total_amount": 5658982,
          "flags": {
            "allowPause": true,
            "allowRenew": true,
            "allowEarlyClose": true,
            "autoCloseOnEnd": false
          },
          "allowedActions": ["pause", "renew", "close"]
        }
      ],
      "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
    }
    ```

### 7.2 Create Subscription
- **`POST /api/v1/subscriptions`**
  - **Access:** `STAFF`, `ADMIN`
  - **Request Body:**
    ```json
    {
      "customer_id": "cust_101",
      "plan_id": "plan_1",
      "start_date": "2026-11-01",
      "expiry_date": "2027-10-31",
      "payment_terms": "Net 30",
      "lines": [
        {
          "product_id": "prod_1",
          "variant_id": "var_2",
          "qty": 5,
          "unit_price": 555900,
          "tax_id": "tax_gst_18"
        }
      ]
    }
    ```

### 7.3 Lifecycle Transition
- **`PATCH /api/v1/subscriptions/:id/transition`**
  - **Access:** Staff / Admin for full lifecycle; Customer allowed only `pause` and `renew` if flags permit.
  - **Request Body:** `{ "action": "send_quotation" | "confirm" | "activate" | "pause" | "renew" | "close" }`
  - **Response:** Updated Subscription with new `status` and recalculated `allowedActions`.

---

## 8. Invoices, Billing Engine & Payments

**Invoice Lifecycle:** `Draft` ➔ `Confirmed` ➔ `Paid` (or `Cancelled`)

### 8.1 List Invoices
- **`GET /api/v1/invoices`**
  - **Access:** `CUSTOMER` (filtered to own), `STAFF`, `ADMIN`
  - **Query Params:** `status`, `customerId`, `isOverdue`, `page`, `limit`
  - **Response (`200 OK`):**
    ```json
    {
      "data": [
        {
          "id": "inv_5001",
          "invoice_number": "INV/2026/00318",
          "subscription_id": "sub_1001",
          "customer_id": "cust_101",
          "customer_name": "Acme Corp",
          "status": "CONFIRMED",
          "issue_date": "2026-10-01",
          "due_date": "2026-10-15",
          "is_overdue": true,
          "total_amount": 5658982,
          "amount_paid": 2000000,
          "amount_due": 3658982,
          "currency": "INR"
        }
      ],
      "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
    }
    ```

### 8.2 Invoice Status Update & Dispatch
- **`PATCH /api/v1/invoices/:id/status`** — `{ "status": "CONFIRMED" | "CANCELLED" }`
- **`POST /api/v1/invoices/:id/send`** — Triggers email dispatch to customer

### 8.3 Record Payment
- **`POST /api/v1/invoices/:id/payments`**
  - **Access:** `STAFF`, `ADMIN`
  - **Request Body:**
    ```json
    {
      "method": "BANK_TRANSFER",
      "amount": 3658982,
      "date": "2026-10-31",
      "note": "NEFT ref #998822001"
    }
    ```
  - **Side Effect:** Automatically transitions invoice status to `PAID` once `amount_paid >= total_amount`.

### 8.4 List Payments (Ledger)
- **`GET /api/v1/payments`**
  - **Access:** `STAFF`, `ADMIN`
  - **Query Params:** `method`, `dateFrom`, `dateTo`, `invoiceId`, `page`, `limit`

### 8.5 Automated Recurring Billing Engine
- **`POST /api/v1/billing/run`** *(Admin Only)*
  - **Description:** Idempotent batch run scanning all active subscriptions due for renewal in the current period.
  - **Response (`200 OK`):**
    ```json
    {
      "created": 14,
      "skipped": 82,
      "failed": 0,
      "invoice_ids": ["inv_5021", "inv_5022", ...]
    }
    ```
- **`POST /api/v1/invoices/generate-from-subscription/:subscriptionId`** *(Staff/Admin)*
  - Generates a single invoice for a specific subscription on-demand.

---

## 9. Discounts & Taxes (Admin Only)

### 9.1 Discount Rules
- **`GET /api/v1/catalog/discounts`** & **`POST /api/v1/admin/catalog/discounts`**
  - **Request Body:**
    ```json
    {
      "code": "DIWALI2026",
      "type": "PERCENTAGE",
      "value": 1500,
      "min_spend": 1000000,
      "min_qty": 1,
      "start_date": "2026-10-01",
      "end_date": "2026-11-15",
      "max_usage": 100,
      "target": "SUBSCRIPTION"
    }
    ```
- **`POST /api/v1/catalog/discounts/validate`**
  - **Request Body:** `{ "code": "DIWALI2026", "subtotal": 1200000, "qty": 2 }`
  - **Response:** `{ "valid": true, "discount_amount": 180000 }`

### 9.2 Tax Rules
- **`GET /api/v1/catalog/taxes`** & **`POST /api/v1/admin/catalog/taxes`**
  - **Request Body:**
    ```json
    {
      "name": "GST 18%",
      "rate": 1800,
      "computation": "PERCENTAGE",
      "is_included_in_price": false
    }
    ```

---

## 10. Finance Lead Analytics (Admin Only)

### 10.1 KPI Cards
- **`GET /api/v1/analytics/kpis`**
  - **Access:** `ADMIN` role only (Finance Lead)
  - **Response (`200 OK`):**
    ```json
    {
      "active_subscriptions": 142,
      "revenue_collected": 348500000,
      "outstanding_amount": 42100000,
      "overdue_invoices_count": 9,
      "mrr": 28400000,
      "currency": "INR"
    }
    ```

### 10.2 Revenue Chart
- **`GET /api/v1/analytics/revenue-chart`**
  - **Query Params:** `period=monthly|daily`
  - **Response:** Array of `{ "period": "2026-10", "revenue": 34850000, "projected": 38000000 }`

### 10.3 Overdue Invoices Aging Table
- **`GET /api/v1/analytics/overdue-invoices`**
  - **Query Params:** `page`, `limit`, `days_bucket=1-30|31-60|60+`
  - Server-side paginated list optimized for sub-second retrieval.

