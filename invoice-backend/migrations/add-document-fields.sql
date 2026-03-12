-- Migration: Add document storage fields to invoice_ledger
-- Layer-3: Off-Chain Storage (IPFS)

-- Add document_hash column (SHA-256 of PDF binary)
ALTER TABLE invoice_ledger 
ADD COLUMN IF NOT EXISTS document_hash TEXT;

-- Add ipfs_cid column (IPFS Content Identifier)
ALTER TABLE invoice_ledger 
ADD COLUMN IF NOT EXISTS ipfs_cid TEXT;

-- Add index for document_hash lookups
CREATE INDEX IF NOT EXISTS idx_invoice_ledger_document_hash 
ON invoice_ledger(document_hash);

-- Add index for ipfs_cid lookups
CREATE INDEX IF NOT EXISTS idx_invoice_ledger_ipfs_cid 
ON invoice_ledger(ipfs_cid);

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invoice_ledger' 
  AND column_name IN ('document_hash', 'ipfs_cid');
