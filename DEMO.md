# Business logic service demo and QA handoff

## Start

```sh
npm install
npm run build
npm start
```

The TypeScript service listens on port 3000 by default. It is stateless and
calculates over HTTP; it has no SQLite connection. Go owns all database reads,
writes, migrations, and fixture loading.

## Demo requests

Use `http://localhost:3000` as the base URL. Amounts are integer minor units;
the examples use INR paise.

### Pricing — `POST /api/v1/pricing/calculate`

```json
{"base_price":15000,"quantity":1,"variant_adjustments":[{"variant_name":"Region: APAC Cloud","price_extra":2000}]}
```

Expected calculation: unit price `17000`, line amount `17000`.

### Tax — `POST /api/v1/tax/calculate`

```json
{"taxable_amount":17000,"tax_rules":[{"name":"GST 18%","rate_percentage":18,"type":"PERCENTAGE","is_inclusive":false,"is_active":true}]}
```

Expected: tax `3060`, gross amount `20060`.

### Discount — `POST /api/v1/discounts/calculate`

```json
{"subtotal_cents":20000,"total_quantity":1,"evaluation_date":"2026-10-31T12:00:00Z","rule":{"code":"DEMO10","type":"PERCENTAGE","value":10,"min_quantity":1,"min_purchase_amount":0,"start_date":"2026-01-01T00:00:00Z","end_date":"2026-12-31T23:59:59Z","max_uses":0,"current_uses":0,"is_active":true}}
```

Expected: eligible, discount `2000`, remaining amount `18000`. For expired or
exhausted scenarios, use `SUMMER2025` or `FIRST10` from
`fixtures/seed-data.json` and pass the fixed evaluation date.

### Invoice calculation — `POST /api/v1/invoices/calculate`

```json
{"lines":[{"product_name":"CRM APAC","base_price":15000,"quantity":1,"variants":[{"variant_name":"Region: APAC Cloud","price_extra":2000}]}],"tax_rules":[{"name":"GST 18%","rate_percentage":18,"type":"PERCENTAGE","is_active":true}],"currency":"INR"}
```

Expected subtotal `17000`, tax `3060`, total `20060`.

### PDF — `POST /api/v1/invoices/pdf`

```json
{"invoice_number":"DEMO-001","customer":{"name":"Apex Technologies","email":"billing@example.test"},"lines":[{"product_name":"CRM APAC","unit_price":17000,"quantity":1,"line_amount":17000}],"subtotal":17000,"tax_total":3060,"final_total":20060,"currency":"INR"}
```

Expected response: `200`, `Content-Type: application/pdf`, attachment named
`invoice-DEMO-001.pdf`.

## QA results and limits

- Seed generation completed; see [`fixtures/README.md`](fixtures/README.md).
- TypeScript typecheck and build pass. Go `go test ./...` passes.
- Vitest discovers 54 tests: 36 pass and 18 HTTP tests fail here because the
  sandbox disallows binding to `127.0.0.1` (`listen EPERM`). None were skipped.
- Direct service smoke check passed for pricing, tax, discount, invoice totals,
  and PDF bytes (`%PDF-`, 2656 bytes). 10,000 in-process pricing calculations
  took about 4 ms in this run. This is not an HTTP endpoint performance result.
- The PDF request schema was adjusted to accept the documented snake_case
  fields; typecheck/build pass after the change.
- No Go-to-TypeScript HTTP caller or end-to-end integration test exists in the
  repository, so cross-service integration is unverified. The TypeScript app
  exports endpoints, but Go currently does not call them.
- Go has no native `OVERDUE` invoice status; confirmed invoices past `due_date`
  represent overdue balances. Go's `TaxRule` supports percentage rules only.
- Fixtures are not inserted automatically. A Go developer must implement the
  GORM fixture loader and supply `PasswordHash` for seeded users.
