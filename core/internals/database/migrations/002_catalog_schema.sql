-- 002_catalog_schema.sql (SQLite compatible)

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'SOFTWARE', 'ADDON', 'SERVICE'
    sales_price INTEGER NOT NULL, -- price in cents
    cost_price INTEGER NOT NULL,  -- cost in cents
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    variant_name TEXT NOT NULL, -- e.g. 'Brand: Odoo'
    price_extra INTEGER DEFAULT 0, -- extra in cents (e.g. 56000 for $560.00)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    billing_period TEXT NOT NULL, -- 'MONTHLY', 'YEARLY'
    min_quantity INTEGER DEFAULT 1,
    start_date DATE,
    end_date DATE,
    auto_close INTEGER DEFAULT 1,
    allow_pause INTEGER DEFAULT 1,
    allow_early_close INTEGER DEFAULT 1,
    allow_renewal INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Discount Rules Table
CREATE TABLE IF NOT EXISTS discount_rules (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'FIXED', 'PERCENTAGE'
    value REAL NOT NULL, -- fixed cents (e.g. 5000) or percentage (e.g. 15.0)
    min_quantity INTEGER DEFAULT 0,
    min_purchase_amount INTEGER DEFAULT 0, -- in cents
    start_date DATETIME,
    end_date DATETIME,
    max_uses INTEGER DEFAULT 0, -- 0 means unlimited
    current_uses INTEGER DEFAULT 0,
    product_id TEXT, -- NULL applies to entire subscription
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Tax Rules Table
CREATE TABLE IF NOT EXISTS tax_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, -- e.g. 'Standard VAT'
    rate_percentage REAL NOT NULL, -- e.g. 18.0
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_code ON discount_rules(code);
