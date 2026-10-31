-- 004_billing_schema.sql (SQLite compatible)

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    subscription_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, CONFIRMED, PAID, CANCELLED
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal INTEGER NOT NULL,          -- cents
    discount_amount INTEGER DEFAULT 0,  -- cents
    tax_amount INTEGER DEFAULT 0,       -- cents
    total_amount INTEGER NOT NULL,      -- cents
    amount_paid INTEGER DEFAULT 0,       -- cents
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE RESTRICT,
    FOREIGN KEY(customer_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Idempotency Guard: prevent duplicate invoice for same cycle
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_sub_billing_period 
ON invoices (subscription_id, billing_period_start);

-- Invoice Lines
CREATE TABLE IF NOT EXISTS invoice_lines (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL, -- cents
    tax_rate REAL DEFAULT 0.0,
    line_total INTEGER NOT NULL, -- cents
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Payment Transactions
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    payment_method TEXT NOT NULL, -- 'BANK_TRANSFER', 'CREDIT_CARD', 'CASH', 'OTHER'
    amount INTEGER NOT NULL,      -- cents
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
