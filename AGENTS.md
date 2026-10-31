# Project: Brightloop Subscription Management System

Monolithic Go + Gin backend with GORM & SQLite in `core/`.

## Key Business Rules & Architecture
1. **Roles**: Admin (full control, staff creation, catalog/tax/discount setup), Staff (sales, subscriptions, invoices, payments), Customer (portal access to own data).
2. **Password Validation**: >8 chars, 1 uppercase, 1 lowercase, 1 special char.
3. **Product Variants**: E.g. Brand: Odoo (+560 extra price).
4. **Subscription Lifecycle**: `Draft` -> `Quotation` -> `Confirmed` -> `Active` -> `Closed` (plus `Paused`).
5. **Invoice Lifecycle**: `Draft` -> `Confirmed` -> `Paid` / `Cancelled`.
6. **Batch Billing**: Idempotent recurring invoice generation based on plan frequencies (`monthly`, `yearly`) using composite unique index `(subscription_id, billing_period_start)`.
7. **Discounts**: Admin-defined, fixed/percentage, product or subscription scope, min purchase/quantity, usage limits and date windows.
8. **Payments & AR**: Multi-method logging, invoice settlement, overdue invoice aging buckets.
9. **Finance Analytics**: Active subscriptions, collected revenue, outstanding AR, overdue list, sub-second responses (<2ms).
10. **Developer Guide**: Comprehensive reference in `core/DEVELOPER_GUIDE.md`.

