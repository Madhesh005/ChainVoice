-- Run this inside the container to verify everything
-- docker exec -it invoice_registry_db psql -U registry_user -d registry -f /verify-db.sql

-- 1. Check current user and database
SELECT current_user, current_database();

-- 2. List all users
\du

-- 3. List all databases
\l

-- 4. Check if registry database exists
SELECT datname FROM pg_database WHERE datname = 'registry';

-- 5. List all tables in registry database
\dt

-- 6. Check pg_hba.conf authentication method
SHOW hba_file;

-- 7. Verify password encryption method
SELECT rolname, rolpassword IS NOT NULL as has_password 
FROM pg_authid 
WHERE rolname = 'registry_user';

-- 8. Test table creation
CREATE TABLE IF NOT EXISTS invoice_registry (
  id SERIAL PRIMARY KEY,
  invoice_hash TEXT UNIQUE NOT NULL,
  financed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Verify table structure
\d invoice_registry

-- 10. Test insert
INSERT INTO invoice_registry (invoice_hash) 
VALUES ('test_hash_' || NOW()::text)
ON CONFLICT (invoice_hash) DO NOTHING
RETURNING *;

-- 11. Count records
SELECT COUNT(*) as total_records FROM invoice_registry;
