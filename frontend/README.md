# Brightloop Frontend — Subscription, Billing & Revenue Operations

Frontend application for **Brightloop Software** (Unified B2B Subscription, Billing & Revenue Operations Engine), developed for the **Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026** by Developer 2 (Frontend & Role-Based UI).

---

## 1. Quick Start

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

App will run at `http://localhost:5173`.

---

## 2. Environment Variables

Configure via `frontend/.env` (template in `frontend/.env.example`):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Base URL pointing to Go/Gin core backend | `http://localhost:8080/api/v1` |
| `VITE_USE_MOCK` | Enable in-memory realistic seed mock adapter (`true`/`false`) | `true` |
| `VITE_AUTH_STORAGE` | Storage mode: `cookie` (httpOnly cookie) or `localStorage` | `cookie` |
| `VITE_DEFAULT_CURRENCY`| Default display currency | `INR` |
| `VITE_DEFAULT_LOCALE` | Locale for currency and date formatting | `en-IN` |

---

## 3. Demo Accounts (Preset in Mock Database)

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Admin (Finance Lead)** | `admin@brightloop.io` | `AdminPassword123!` | Full control: Finance dashboard, MRR KPIs, products, variants, plans, taxes, discounts, staff creation. |
| **Staff (Sales & Ops)** | `staff@brightloop.io` | `StaffPassword123!` | Subscriptions lifecycle, quotation templates converter, invoices & payments, product catalog view. Restricted from finance dashboard & admin rules. |
| **Customer** | `sarah@acme.inc` | `CustomerPassword123!` | Customer Portal: self-serve view subscriptions, pause/renew actions, view invoices and receipts. |

> **Evaluator Tip:** When `VITE_USE_MOCK=true`, a **Role Switcher** appears in the top navigation bar and on the login screen for instant 1-click role swapping during hackathon evaluations. This switcher is automatically stripped in production mode.

---

## 4. Switching From Mock to Real Backend API

To switch from the prototype in-memory database to the live Go/Gin backend:
1. Ensure the backend server in `core/` is running on port 8080 (`http://localhost:8080`).
2. Update `.env`:
   ```env
   VITE_USE_MOCK=false
   VITE_API_URL=http://localhost:8080/api/v1
   ```
3. Restart Vite (`npm run dev`). **Zero component changes are required.** The service layer automatically proxies all queries and mutations through `apiClient`.

---

## 5. Architecture Highlights
- **Odoo Design Tokens:** `#714B67` primary purple, `#017E84` teal accent, strict typography and zero "AI slop".
- **Strict Role-Based Routing:** `ProtectedRoute` + `RoleGuard` + `403 Forbidden` page.
- **Form Validation:** React Hook Form + Zod schema validation. Live password compliance checklist (`>8 chars`, uppercase, lowercase, special char).
- **Automated Lifecycle State Engine:** Subscriptions (`Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed`) and Invoices (`Draft` ➔ `Confirmed` ➔ `Paid`).
- **Currency Standard:** Stored in cents/paise (`int64`), formatted with Indian currency conventions (`₹`, `en-IN`).
