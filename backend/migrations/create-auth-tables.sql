-- =====================================================
-- Authentication Tables Migration
-- Creates tables for MSME, Lender/NBFC, and Regulator users
-- =====================================================

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS msme_users CASCADE;
DROP TABLE IF EXISTS lender_users CASCADE;
DROP TABLE IF EXISTS regulator_users CASCADE;

-- =====================================================
-- 1. MSME Users Table
-- =====================================================
CREATE TABLE msme_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    gstin VARCHAR(15),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_msme_email ON msme_users(email);
CREATE INDEX idx_msme_gstin ON msme_users(gstin);

-- =====================================================
-- 2. Lender/NBFC Users Table
-- =====================================================
CREATE TABLE lender_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    lender_name VARCHAR(255) NOT NULL,
    lender_type VARCHAR(50) NOT NULL CHECK (lender_type IN ('BANK', 'NBFC', 'FINTECH')),
    license_number VARCHAR(100),
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_lender_email ON lender_users(email);
CREATE INDEX idx_lender_type ON lender_users(lender_type);

-- =====================================================
-- 3. Regulator Users Table (Admin)
-- =====================================================
CREATE TABLE regulator_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'ADMIN',
    permissions TEXT[], -- Array of permissions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_regulator_email ON regulator_users(email);

-- =====================================================
-- 4. User Sessions Table (for JWT token management)
-- =====================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('MSME', 'LENDER', 'REGULATOR')),
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for session management
CREATE INDEX idx_session_user ON user_sessions(user_id, user_type);
CREATE INDEX idx_session_token ON user_sessions(token_hash);
CREATE INDEX idx_session_expires ON user_sessions(expires_at);

-- =====================================================
-- 5. Insert Default Regulator/Admin User
-- Password: admin@123 (will be hashed by the application)
-- =====================================================
-- Note: The actual password hash will be inserted by the migration script
-- This is a placeholder that will be replaced with bcrypt hash

-- Temporary insert (will be replaced by migration script with proper hash)
INSERT INTO regulator_users (email, password_hash, full_name, role, permissions, is_active)
VALUES (
    'admin@gmail.com',
    '$2b$10$PLACEHOLDER', -- This will be replaced by migration script
    'System Administrator',
    'ADMIN',
    ARRAY['ALL'],
    TRUE
);

-- =====================================================
-- 6. Update Timestamp Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for MSME users
CREATE TRIGGER update_msme_users_updated_at 
    BEFORE UPDATE ON msme_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers for Lender users
CREATE TRIGGER update_lender_users_updated_at 
    BEFORE UPDATE ON lender_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers for Regulator users
CREATE TRIGGER update_regulator_users_updated_at 
    BEFORE UPDATE ON regulator_users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. Comments for Documentation
-- =====================================================

COMMENT ON TABLE msme_users IS 'Stores MSME (Micro, Small, Medium Enterprises) user accounts';
COMMENT ON TABLE lender_users IS 'Stores Lender/NBFC user accounts';
COMMENT ON TABLE regulator_users IS 'Stores Regulator/Admin user accounts';
COMMENT ON TABLE user_sessions IS 'Stores active user sessions and JWT tokens';

COMMENT ON COLUMN msme_users.gstin IS 'Goods and Services Tax Identification Number';
COMMENT ON COLUMN lender_users.lender_type IS 'Type of lender: BANK, NBFC, or FINTECH';
COMMENT ON COLUMN regulator_users.permissions IS 'Array of permission strings for role-based access';

-- =====================================================
-- Migration Complete
-- =====================================================
