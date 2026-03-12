-- Add blockchain-related fields to invoices table
-- Run this migration to support invoice identity registration

-- Add blockchain status field
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(50);

-- Add IPFS hash field
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS ipfs_hash VARCHAR(255);

-- Add document hash field
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS document_hash VARCHAR(64);

-- Add blockchain transaction hash field
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(255);

-- Add blockchain block number field
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_block_number VARCHAR(50);

-- Add blockchain timestamp field
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS blockchain_timestamp TIMESTAMP;

-- Add seller name field (if not exists)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS seller_name VARCHAR(500);

-- Add GST amount field (if not exists)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS gst_amount DECIMAL(15, 2);

-- Add total amount field (if not exists)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2);

-- Create index for blockchain status
CREATE INDEX IF NOT EXISTS idx_invoices_blockchain_status ON invoices(blockchain_status);

-- Create index for IPFS hash
CREATE INDEX IF NOT EXISTS idx_invoices_ipfs_hash ON invoices(ipfs_hash);

-- Comments
COMMENT ON COLUMN invoices.blockchain_status IS 'Status on blockchain: AVAILABLE, LOCKED, FINANCED, CLOSED';
COMMENT ON COLUMN invoices.ipfs_hash IS 'IPFS CID of the canonical invoice document';
COMMENT ON COLUMN invoices.document_hash IS 'SHA-256 hash of the canonical invoice';
COMMENT ON COLUMN invoices.blockchain_tx_hash IS 'Hyperledger Fabric transaction hash';
COMMENT ON COLUMN invoices.blockchain_block_number IS 'Block number where invoice was registered';
COMMENT ON COLUMN invoices.blockchain_timestamp IS 'Timestamp of blockchain registration';
