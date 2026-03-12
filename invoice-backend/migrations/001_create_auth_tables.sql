-- Authentication Tables Migration
-- Creates tables for MSME, Lender, and Regulator users

-- ============================================
-- 1. MSME Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS msme_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_msme_email ON msme_users(email);
CREATE INDEX IF NOT EXISTS idx_msme_gstin ON msme_users(gstin);

-- ============================================
-- 2. Lender Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS lender_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lender_email ON lender_users(email);
CREATE INDEX IF NOT EXISTS idx_lender_license ON lender_users(license_number);

-- ============================================
-- 3. Regulator Admin Table (Single User)
-- ============================================
CREATE TABLE IF NOT EXISTS regulator_admin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_regulator_email ON regulator_admin(email);

-- ============================================
-- 4. Update Timestamp Triggers
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_msme_users_updated_at ON msme_users;
CREATE TRIGGER update_msme_users_updated_at
    BEFORE UPDATE ON msme_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lender_users_updated_at ON lender_users;
CREATE TRIGGER update_lender_users_updated_at
    BEFORE UPDATE ON lender_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regulator_admin_updated_at ON regulator_admin;
CREATE TRIGGER update_regulator_admin_updated_at
    BEFORE UPDATE ON regulator_admin
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. Comments
-- ============================================
COMMENT ON TABLE msme_users IS 'MSME user accounts with encrypted passwords';
COMMENT ON TABLE lender_users IS 'Lender/NBFC user accounts with encrypted passwords';
COMMENT ON TABLE regulator_admin IS 'Regulator admin account (single user only)';
