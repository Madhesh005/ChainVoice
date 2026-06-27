require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('Complete Production Database Setup');
console.log('========================================\n');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function setupDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('✓ Connected to database\n');

        // ============================================
        // STEP 1: Create Authentication Tables
        // ============================================
        console.log('📋 Step 1: Creating authentication tables...');
        const authSql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create-auth-tables.sql'),
            'utf8'
        );
        await client.query(authSql);
        console.log('✓ Authentication tables created\n');

        // ============================================
        // STEP 2: Create ERP Tables
        // ============================================
        console.log('📋 Step 2: Creating ERP tables...');
        const erpSql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create-erp-tables.sql'),
            'utf8'
        );
        await client.query(erpSql);
        console.log('✓ ERP tables created\n');

        // ============================================
        // STEP 3: Create Financing Tables
        // ============================================
        console.log('📋 Step 3: Creating financing tables...');
        const financingSql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create-financing-tables.sql'),
            'utf8'
        );
        await client.query(financingSql);
        console.log('✓ Financing tables created\n');

        // ============================================
        // STEP 4: Create Notifications Table
        // ============================================
        console.log('📋 Step 4: Creating notifications table...');
        const notificationsSql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create-notifications-table.sql'),
            'utf8'
        );
        await client.query(notificationsSql);
        console.log('✓ Notifications table created\n');

        // ============================================
        // STEP 5: Create Activity Log Table
        // ============================================
        console.log('📋 Step 5: Creating activity log table...');
        const activityLogSql = fs.readFileSync(
            path.join(__dirname, 'migrations', 'create-activity-log-table.sql'),
            'utf8'
        );
        await client.query(activityLogSql);
        console.log('✓ Activity log table created\n');

        // ============================================
        // STEP 6: Create Test Accounts
        // ============================================
        console.log('📋 Step 6: Creating test accounts...');
        
        // Hash passwords
        const msmePassword = await bcrypt.hash('msme123', 10);
        const hdfcPassword = await bcrypt.hash('hdfc123', 10);
        const axisPassword = await bcrypt.hash('axis123', 10);
        const bajajPassword = await bcrypt.hash('bajaj123', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);

        // MSME Test Account
        await client.query(`
            INSERT INTO msme_users (
                email, password_hash, company_name, gstin, 
                contact_person, phone, is_verified
            )
            VALUES (
                'msme@test.com', $1, 'Test MSME Company', '29ABCDE1234F1Z5',
                'MSME Test User', '9876543210', true
            )
            ON CONFLICT (email) DO NOTHING;
        `, [msmePassword]);
        console.log('  ✓ MSME test account created (msme@test.com / msme123)');

        // HDFC Lender Account
        await client.query(`
            INSERT INTO lender_users (
                email, password_hash, lender_name, lender_type,
                license_number, contact_person, phone, is_verified
            )
            VALUES (
                'hdfc@test.com', $1, 'HDFC Bank', 'BANK',
                'HDFC-LIC-001', 'HDFC Test User', '9876543211', true
            )
            ON CONFLICT (email) DO NOTHING;
        `, [hdfcPassword]);
        console.log('  ✓ HDFC test account created (hdfc@test.com / hdfc123)');

        // Axis Lender Account
        await client.query(`
            INSERT INTO lender_users (
                email, password_hash, lender_name, lender_type,
                license_number, contact_person, phone, is_verified
            )
            VALUES (
                'axis@test.com', $1, 'Axis Bank', 'BANK',
                'AXIS-LIC-001', 'Axis Test User', '9876543212', true
            )
            ON CONFLICT (email) DO NOTHING;
        `, [axisPassword]);
        console.log('  ✓ Axis test account created (axis@test.com / axis123)');

        // Bajaj Lender Account
        await client.query(`
            INSERT INTO lender_users (
                email, password_hash, lender_name, lender_type,
                license_number, contact_person, phone, is_verified
            )
            VALUES (
                'bajaj@test.com', $1, 'Bajaj Finance', 'NBFC',
                'BAJAJ-LIC-001', 'Bajaj Test User', '9876543213', true
            )
            ON CONFLICT (email) DO NOTHING;
        `, [bajajPassword]);
        console.log('  ✓ Bajaj test account created (bajaj@test.com / bajaj123)');

        // Admin Account
        await client.query(`
            INSERT INTO regulator_users (
                email, password_hash, full_name, role
            )
            VALUES (
                'admin@test.com', $1, 'System Administrator', 'ADMIN'
            )
            ON CONFLICT (email) DO NOTHING;
        `, [adminPassword]);
        console.log('  ✓ Admin test account created (admin@test.com / admin123)');

        console.log('\n✓ All test accounts created\n');

        // ============================================
        // STEP 7: Verify Tables
        // ============================================
        console.log('📋 Step 7: Verifying database setup...');
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log(`  ✓ Total tables created: ${tables.rows.length}`);
        tables.rows.forEach(row => {
            console.log(`    - ${row.table_name}`);
        });

        console.log('\n========================================');
        console.log('✅ Database Setup Complete!');
        console.log('========================================\n');

        console.log('🔐 Test Login Credentials:');
        console.log('   MSME:  msme@test.com  / msme123');
        console.log('   HDFC:  hdfc@test.com  / hdfc123');
        console.log('   Axis:  axis@test.com  / axis123');
        console.log('   Bajaj: bajaj@test.com / bajaj123');
        console.log('   Admin: admin@test.com / admin123');
        console.log('\n📝 Next Steps:');
        console.log('   1. Start backend: cd invoice-backend && npm start');
        console.log('   2. Start frontend: cd client && npm run dev');
        console.log('   3. Test login with any of the accounts above\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error('\nStack:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run setup
setupDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
