-- Fix invoices.msme_id column to use UUID instead of VARCHAR
-- This ensures proper foreign key relationship with msme_users table

-- Step 1: Check current data and attempt conversion
DO $$
BEGIN
    -- Try to convert existing data to UUID format if possible
    -- If data is already in UUID format, this will succeed
    -- If not, we'll need to clean it up first
    BEGIN
        ALTER TABLE invoices 
        ALTER COLUMN msme_id TYPE UUID USING msme_id::UUID;
        
        RAISE NOTICE 'Successfully converted msme_id to UUID';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not convert msme_id directly. Cleaning up invalid data...';
            
            -- Delete invoices with invalid msme_id (not valid UUIDs)
            DELETE FROM invoices 
            WHERE msme_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
            
            -- Now try conversion again
            ALTER TABLE invoices 
            ALTER COLUMN msme_id TYPE UUID USING msme_id::UUID;
            
            RAISE NOTICE 'Cleaned up and converted msme_id to UUID';
    END;
END $$;

-- Step 2: Add foreign key constraint to msme_users table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_invoices_msme'
    ) THEN
        ALTER TABLE invoices
        ADD CONSTRAINT fk_invoices_msme 
        FOREIGN KEY (msme_id) REFERENCES msme_users(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint fk_invoices_msme';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_invoices_msme already exists';
    END IF;
END $$;

-- Step 3: Create index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_invoices_msme_id ON invoices(msme_id);

-- Verify the migration
DO $$
DECLARE
    col_type TEXT;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'msme_id';
    
    IF col_type = 'uuid' THEN
        RAISE NOTICE '✅ msme_id column type: uuid';
    ELSE
        RAISE WARNING '⚠️  msme_id column type: % (expected uuid)', col_type;
    END IF;
END $$;

COMMENT ON COLUMN invoices.msme_id IS 'UUID reference to msme_users table';
