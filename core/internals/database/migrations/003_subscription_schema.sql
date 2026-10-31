-- 003_subscription_schema.sql (SQLite compatible)

-- Quotation Templates
CREATE TABLE IF NOT EXISTS quotation_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    validity_days INTEGER DEFAULT 30,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Template Lines
CREATE TABLE IF NOT EXISTS quotation_template_lines (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER NOT NULL, -- cents
    FOREIGN KEY(template_id) REFERENCES quotation_templates(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

-- Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    subscription_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, QUOTATION, CONFIRMED, ACTIVE, PAUSED, CLOSED
    start_date DATE NOT NULL,
    expiry_date DATE,
    valid_until DATETIME,
    next_billing_date DATE NOT NULL,
    last_billed_date DATE,
    payment_terms TEXT DEFAULT 'NET30',
    applied_discount_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY(plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
    FOREIGN KEY(applied_discount_id) REFERENCES discount_rules(id) ON DELETE SET NULL
);

-- Subscription Line Items
CREATE TABLE IF NOT EXISTS subscription_lines (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    variant_id TEXT,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL, -- in cents
    tax_rate REAL DEFAULT 0.0,
    subtotal INTEGER NOT NULL,   -- in cents
    FOREIGN KEY(subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY(variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_billing ON subscriptions(next_billing_date);
