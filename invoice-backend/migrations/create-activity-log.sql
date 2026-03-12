-- Activity Log Table
-- Tracks user activities for dashboard display

CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    lender_identifier VARCHAR(100) NOT NULL,
    giid VARCHAR(64),
    action VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Legacy fields for backward compatibility
    msme_id VARCHAR(255),
    activity_type VARCHAR(50),
    activity_title VARCHAR(255),
    activity_description TEXT,
    related_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    related_invoice_number VARCHAR(255),
    metadata JSONB
);

-- Required indexes for lender activity
CREATE INDEX IF NOT EXISTS idx_activity_lender ON activity_log(lender_identifier);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_log(created_at DESC);

-- Legacy indexes for backward compatibility
CREATE INDEX IF NOT EXISTS idx_activity_log_msme_id ON activity_log(msme_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);

-- Comments
COMMENT ON TABLE activity_log IS 'Tracks user activities for dashboard display';
COMMENT ON COLUMN activity_log.activity_type IS 'Type of activity: invoice_registered, erp_synced, invoice_financed, etc.';
COMMENT ON COLUMN activity_log.metadata IS 'Additional data in JSON format (amount, count, etc.)';
