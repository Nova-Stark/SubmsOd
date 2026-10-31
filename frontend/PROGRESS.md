# Brightloop Software — Frontend Development Handover & Progress Log
**Event:** Odoo x Make-A-Ton 9.0 Kochi Hackathon 2026  
**Role:** Developer 2 (Frontend & Role-Based UI)  
**Developer Identity:** Bal Govind B (`balgovindb2006@gmail.com`)  
**Repository Path:** `c:\Users\balgo\Desktop\SubmsOd` (All frontend code strictly lives in `frontend/`)  
**Currency Standard:** INR (`₹`), `en-IN`, minor units (paise/cents, factor 100)  
**Design System:** Odoo purple (`#714B67`), teal (`#017E84`), slate neutrals, zero AI-slop  

---

## 1. Work Completed So Far

### Hour 0–1: Foundations, Design Tokens, Auth & Role Guards
- Initialized React 19 + TypeScript + Vite + Tailwind CSS v4 in `SubmsOd/frontend/`.
- Configured Odoo design tokens (`#714B67`, `#017E84`) in `src/index.css`.
- Delivered `API_CONTRACT.md` detailing standard pagination `{ data, meta }`, field-level error mapping `{ code, message, fieldErrors }`, and billing run endpoints.
- Built live password strength checklist: `>8 chars`, uppercase, lowercase, special character.
- Public customer signup (never accepts client role; always creates `CUSTOMER`).
- Built role-based routing guards: `ProtectedRoute`, `RoleGuard`, and `403 Forbidden` page.
- Built conditional `RoleSwitcher` in top navigation and login screen, active **strictly when `VITE_USE_MOCK=true`**.
- Created in-memory mock database and adapter in `src/services/mock/`.

### Hour 1–3: Catalog, Plans, Dynamic Subscriptions & Quotation Converter
- **Product Catalog & Variant Engine** (`/staff/products` & `/admin/products/new`):
  - Catalog list with filter by type (`SOFTWARE`, `ADDON`, `SERVICE`), margin calculation.
  - Expandable variant breakdown displaying extra price adders (e.g., **Brand: Odoo Enterprise Connector adding +₹560.00**).
  - Product creation modal with dynamic variant rows and 1-click Odoo preset adder.
- **Subscription Plan Manager** (`/staff/plans` & `/admin/plans/new`):
  - Plans matrix with frequency badges (`DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY`) and min quantity.
  - Dynamic lifecycle permission flags: `allowPause`, `allowRenew`, `allowEarlyClose`, `autoCloseOnEnd`.
  - Plan creation modal (Admin only) with policy checkboxes.
- **Dynamic Subscription Builder** (`/staff/subscriptions/new`):
  - Customer and Plan selectors.
  - Interactive multi-line builder with dynamic product/variant price updates, GST 18% calculation, and coupon validation (`DIWALI2026`, `WELCOME500`).
  - Real-time grand total calculation and actions to Save as Draft or Generate Quotation.
- **Visual State Stepper & Detail View** (`/staff/subscriptions/:id`):
  - Stepper tracking `Draft` ➔ `Quotation` ➔ `Confirmed` ➔ `Active` ➔ `Closed`.
  - Contextual lifecycle transition buttons (*Send Quote*, *Confirm*, *Activate*, *Pause*, *Renew*, *Close*).
- **Quotation Template Converter** (`/staff/quotation-templates`):
  - Template bundles (e.g. *Growth Tech Bundle (Odoo Edition)*, 30 days validity).
  - 1-click modal converting templates into live subscriptions.

### Hour 3–5: Customer Portal View
- **Customer Subscriptions View** (`/portal/subscriptions` & `/portal/subscriptions/:id`):
  - Filtered to authenticated customer account (e.g. Acme Corp).
  - Expandable contract cards with itemized order lines, variant pricing, tax totals.
  - Self-serve **Pause Subscription** action gated by plan flag `allowPause: true`.
  - Self-serve **Renew Subscription** action gated by plan flag `allowRenew: true` (extends contract expiry by 1 full year).
  - Toast notifications and state engine updates on transition actions.
- **Customer Invoices & Receipts View** (`/portal/invoices` & `/portal/invoices/:id`):
  - Filtered to customer account with status tabs (`ALL`, `DRAFT`, `CONFIRMED`, `PAID`, `CANCELLED`).
  - Overdue badge highlights and outstanding amount indicators.
  - Itemized lines, GST calculation, payments history list.
  - 1-click **Print / Download Receipt** action triggering print stylesheet.

### Hour 5–6: Finance Lead Dashboard (Admin Only)
- **Executive KPI Cards** (`/admin/dashboard`):
  - Active Subscriptions, Total Revenue Collected (with period trends), Outstanding AR, Overdue Invoices.
  - Compact Indian notation formatters (e.g. `₹3.48 Cr`, `₹5.20 L`).
  - Real-time Monthly Recurring Revenue (MRR) indicator.
- **Interactive Revenue Chart**:
  - Toggle between Monthly and Daily views.
  - Dynamic dual bars comparing Actual Revenue vs Projected Revenue.
- **Overdue Invoices Chasing Table**:
  - Sub-second retrieval with server-side pagination.
  - Debounced search filter by customer or invoice number.
  - Direct overdue debt amounts formatted in INR.

---

## 2. Next Up on the Schedule

### Hour 6–7: Invoice Operations, Settlement, Admin Rules & Polish (Current Task)
- `/staff/invoices` & `/staff/invoices/:id`: Invoice status transitions (`Draft` ➔ `Confirmed` ➔ `Paid`), print-friendly receipt view.
- Record Payment modal (Method: Bank Transfer / UPI / Card / Cash, Amount, Date, Note).
- Admin Discounts & Tax rules managers (`/admin/discounts`, `/admin/taxes`).
- Admin Staff creation (`/admin/staff` via `POST /api/v1/admin/staff`).

---

## 3. Strict Development Rules
1. Work **only** in `frontend/`, never push to repo root.
2. Run `git pull --rebase` before every commit.
3. Verify git identity is `Bal Govind B <balgovindb2006@gmail.com>`.
4. Commit small and often with conventional commit messages (e.g. `feat(dashboard): ...`).
5. Print a one-line summary after each commit for the team leader.
6. Zero AI-slop: Odoo-inspired enterprise styling, high contrast, clean typography.
