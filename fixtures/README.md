# Go seed fixture dataset

Generate the deterministic dataset from the repository root:

```sh
npm run generate:fixtures
```

This writes `fixtures/seed-data.json`. It is JSON only; TypeScript does not open,
create, or modify SQLite. The Go application must perform all database writes.

The top-level arrays use Go model JSON field names for `Product` (with nested
variants), `Plan`, `TaxRule`, `DiscountRule`, `User` (under `customers`),
`Subscription` (with lines), and `Invoice` (with lines and payments). Seed in
dependency order: products/variants, plans, discounts and taxes, users,
subscriptions/lines, then invoices/lines/payments. Insert within a Go GORM
transaction and preserve the supplied IDs. `customers` contains only fields
supported by `models.User`; the Go seeder must supply a password hash (for
example, hash a documented local fixture password with the existing auth
package) because `PasswordHash` is required by the database.

All prices, quantities' extended totals, tax and payment amounts are integer
minor units (the Go guide calls them cents). Percentage rates remain numeric
percentages. The fixture tax rules intentionally use only the Go model's
supported percentage form; fixed and inclusive tax options in the TypeScript
calculation service do not exist in `models.TaxRule`.

## Included scenarios

- 4 products and 7 variants; 3 plans with monthly/yearly periods and different
  minimum quantities and lifecycle flags.
- 5 customers beyond the 110 subscriptions; 102 subscriptions are active, plus
  quotation, paused, and closed states. Quantities respect each plan minimum.
- 6 discounts: active, product scoped, expired, future dated, and exhausted.
- 40 paid invoices with matching full payments, 35 confirmed unpaid invoices
  whose due dates are past, and 30 current draft/confirmed invoices. Go models
  do not have an `OVERDUE` invoice status; determine overdue from
  `CONFIRMED && due_date < now`.
- Invoice totals satisfy `subtotal - discount_amount + tax_amount` and the
  supplied invoice cycles are unique per subscription.

The dates are anchored to 2026-10-31 UTC so status and aging scenarios are
repeatable. A Go demo should pass a matching fixed clock when evaluating them.
The invoice snapshots are intended for finance/reporting and calculation
checks; billing engine generated invoices use the engine's own current clock.

## Sample expected calculation

For CRM APAC, one unit is `sales_price 15000 + price_extra 2000 = 17000`
minor units. At 18% tax with no discount, expected subtotal is `17000`, tax is
`3060`, total is `20060`. Use integer minor units throughout.
