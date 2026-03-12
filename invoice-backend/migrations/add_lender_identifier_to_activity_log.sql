-- Add lender_identifier column to activity_log table for lender-scoped activity logging
-- This fixes the issue where all lenders see each other's activities

ALTER TABLE activity_log 
ADD COLUMN IF NOT EXISTS lender_identifier VARCHAR(50);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_log_lender_identifier 
ON activity_log(lender_identifier);

-- Create index for combined queries
CREATE INDEX IF NOT EXISTS idx_activity_log_lender_created 
ON activity_log(lender_identifier, created_at DESC);

-- Update existing records to have NULL lender_identifier (they were MSME activities)
-- New lender activities will have the proper lender_identifier set

COMMENT ON COLUMN activity_log.lender_identifier IS 'Lender identifier for lender-specific activities (HDFC_BANK, AXIS_BANK, etc.)';