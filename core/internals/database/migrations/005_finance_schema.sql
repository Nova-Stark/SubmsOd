-- 005_finance_schema.sql (SQLite compatible)

-- High-performance composite indexes for financial aggregations and filtering
CREATE INDEX IF NOT EXISTS idx_subs_status_perf ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_status_duedate_perf ON invoices(status, due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_date_perf ON payments(payment_date);
