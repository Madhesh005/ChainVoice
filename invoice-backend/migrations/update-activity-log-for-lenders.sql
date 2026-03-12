-- Update activity_log table for lender activity tracking
-- Add required columns for lender-specific activity logging

-- Add lender_identifier column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'lender_identifier') THEN
        ALTER TABLE activity_log ADD COLUMN lender_identifier VARCHAR(100);
    END IF;
END $$;

-- Add giid column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'giid') THEN
        ALTER TABLE activity_log ADD COLUMN giid VARCHAR(64);
    END IF;
END $$;

-- Add action column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'action') THEN
        ALTER TABLE activity_log ADD COLUMN action VARCHAR(50);
    END IF;
END $$;

-- Add description column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_log' AND column_name = 'description') THEN
        ALTER TABLE activity_log ADD COLUMN description TEXT;
    END IF;
END $$;

-- Create required indexes
CREATE INDEX IF NOT EXISTS idx_activity_lender ON activity_log(lender_identifier);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity_log(created_at DESC);

-- Update existing records to have lender_identifier if possible
-- This is a one-time migration for existing data
UPDATE activity_log 
SET lender_identifier = 'SYSTEM' 
WHERE lender_identifier IS NULL;