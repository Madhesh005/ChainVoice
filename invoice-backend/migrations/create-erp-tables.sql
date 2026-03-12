-- ERP Integration Tables
-- Run this migration to create tables for ERP connections and invoices

-- Table: erp_connections
-- Stores ERP connection details for each MSME
CREATE TABLE IF NOT EXISTS erp_connections (
    id SERIAL PRIMARY KEY,
    msme_id VARCHAR(255) NOT NULL,
    erp_type VARCHAR(50) NOT NULL, -- 'odoo', 'zoho', 'sap', 'tally'
    base_url VARCHAR(500) NOT NULL,
    database VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'failed'
    last_error TEXT,
    UNIQUE(msme_id, erp_type)
);

-- Table: invoices
-- Stores normalized invoice data from all ERPs
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    msme_id VARCHAR(255) NOT NULL,
    erp_connection_id INTEGER REFERENCES erp_connections(id) ON DELETE CASCADE,
    erp_invoice_id VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(255) NOT NULL,
    invoice_date DATE NOT NULL,
    buyer_name VARCHAR(500),
    buyer_gstin VARCHAR(50),
    seller_gstin VARCHAR(50),
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) NOT NULL, -- 'draft', 'posted', 'paid', 'cancelled'
    raw_data JSONB, -- Store complete raw invoice data
    normalized_hash VARCHAR(64), -- SHA-256 hash of normalized data
    blockchain_tx_id VARCHAR(255), -- For future blockchain integration
    giid VARCHAR(64), -- Global Invoice ID (after registration)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(erp_connection_id, erp_invoice_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_msme_id ON invoices(msme_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_giid ON invoices(giid);
CREATE INDEX IF NOT EXISTS idx_erp_connections_msme_id ON erp_connections(msme_id);

-- Comments
COMMENT ON TABLE erp_connections IS 'Stores ERP connection credentials for MSMEs';
COMMENT ON TABLE invoices IS 'Normalized invoice data from all ERP systems';
COMMENT ON COLUMN erp_connections.encrypted_password IS 'AES encrypted password';
COMMENT ON COLUMN invoices.raw_data IS 'Complete raw invoice data from ERP for audit';
COMMENT ON COLUMN invoices.normalized_hash IS 'SHA-256 hash for integrity verification';
