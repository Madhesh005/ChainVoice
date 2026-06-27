-- Fix lender_id column to use UUID instead of TEXT
-- This migration ensures proper foreign key relationship with lender_users table

-- Step 1: Drop the old constraint if it exists
ALTER TABLE financing_requests 
DROP CONSTRAINT IF EXISTS unique_invoice_lender;

-- Step 2: Drop the old index
DROP INDEX IF EXISTS idx_financing_requests_lender;

-- Step 3: Change lender_id from TEXT to UUID
-- First, try to update existing data (convert TEXT to UUID if valid UUIDs exist)
-- If there's invalid data, this will fail and require manual cleanup
ALTER TABLE financing_requests 
ALTER COLUMN lender_id TYPE UUID USING lender_id::UUID;

-- Step 4: Add foreign key constraint to lender_users table
ALTER TABLE financing_requests
ADD CONSTRAINT fk_lender FOREIGN KEY (lender_id) REFERENCES lender_users(id) ON DELETE CASCADE;

-- Step 5: Recreate the unique constraint
ALTER TABLE financing_requests
ADD CONSTRAINT unique_invoice_lender UNIQUE (invoice_giid, lender_id);

-- Step 6: Recreate the index with proper type
CREATE INDEX idx_financing_requests_lender ON financing_requests(lender_id, status);

-- Add comment
COMMENT ON COLUMN financing_requests.lender_id IS 'UUID reference to lender_users table';
