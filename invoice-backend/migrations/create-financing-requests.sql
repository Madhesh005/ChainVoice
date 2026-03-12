-- Create financing_requests table
-- This table tracks financing requests from MSMEs to lenders

CREATE TABLE IF NOT EXISTS financing_requests (
  id SERIAL PRIMARY KEY,
  invoice_giid TEXT NOT NULL,
  invoice_id INTEGER NOT NULL,
  lender_id TEXT NOT NULL,
  msme_id UUID NOT NULL,
  status TEXT DEFAULT 'PENDING',
  requested_amount DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  CONSTRAINT fk_msme FOREIGN KEY (msme_id) REFERENCES msme_users(id) ON DELETE CASCADE,
  
  -- Prevent duplicate requests for same invoice-lender pair
  CONSTRAINT unique_invoice_lender UNIQUE (invoice_giid, lender_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_financing_requests_lender ON financing_requests(lender_id, status);
CREATE INDEX IF NOT EXISTS idx_financing_requests_msme ON financing_requests(msme_id);
CREATE INDEX IF NOT EXISTS idx_financing_requests_giid ON financing_requests(invoice_giid);

-- Add comment
COMMENT ON TABLE financing_requests IS 'Tracks financing requests from MSMEs to lenders';
