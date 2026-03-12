-- Lender Invoice Access Table
-- Controls which lenders can see which invoices

CREATE TABLE IF NOT EXISTS lender_invoice_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_giid VARCHAR(64) NOT NULL,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    lender_id VARCHAR(100) NOT NULL,
    msme_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(invoice_giid, lender_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lender_invoice_access_giid ON lender_invoice_access(invoice_giid);
CREATE INDEX IF NOT EXISTS idx_lender_invoice_access_lender ON lender_invoice_access(lender_id);
CREATE INDEX IF NOT EXISTS idx_lender_invoice_access_msme ON lender_invoice_access(msme_id);
CREATE INDEX IF NOT EXISTS idx_lender_invoice_access_invoice ON lender_invoice_access(invoice_id);

-- Comments
COMMENT ON TABLE lender_invoice_access IS 'Maps invoices to lenders who can view and finance them';
COMMENT ON COLUMN lender_invoice_access.invoice_giid IS 'Global Invoice ID from blockchain';
COMMENT ON COLUMN lender_invoice_access.lender_id IS 'Identifier of the lender (e.g., HDFC_BANK)';
COMMENT ON COLUMN lender_invoice_access.msme_id IS 'MSME who owns the invoice';
