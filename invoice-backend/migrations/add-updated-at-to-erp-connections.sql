-- Add updated_at column to erp_connections table
-- This column is referenced by the model but was missing from the original schema

ALTER TABLE erp_connections 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_erp_connections_updated_at ON erp_connections;

CREATE TRIGGER update_erp_connections_updated_at
    BEFORE UPDATE ON erp_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update existing records to have updated_at same as created_at
UPDATE erp_connections 
SET updated_at = created_at 
WHERE updated_at IS NULL;

COMMENT ON COLUMN erp_connections.updated_at IS 'Timestamp of last update to this ERP connection';
