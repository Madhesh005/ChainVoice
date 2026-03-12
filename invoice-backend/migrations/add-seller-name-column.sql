-- Add seller_name column to invoices table
-- This migration adds the seller_name field to store the company/seller name

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS seller_name VARCHAR(500);

-- Add comment
COMMENT ON COLUMN invoices.seller_name IS 'Name of the seller/company issuing the invoice';

-- Update existing invoices to set seller_name from raw_data if available
-- This is optional and depends on your data structure
UPDATE invoices 
SET seller_name = COALESCE(
    raw_data->>'company_name',
    raw_data->'company_id'->>1,
    'Unknown'
)
WHERE seller_name IS NULL AND raw_data IS NOT NULL;
