require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

console.log('\n========================================');
console.log('ChainVoice Production Database Setup');
console.log('========================================\n');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration(client, filename, description) {
    try {
        console.log(`📋 ${description}...`);
        const sql = fs.readFileSync(
            path.join(__dirname, 'migrations', filename),
            'utf8'
        );
        await client.query(sql);
        console.log(`✓ ${description} complete\n`);
    } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('does not exist')) {
            console.log(`⚠ ${description} - already exists or skipped\n`);
        } else {
            throw error;
        }
    }
}

async function setupDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('✓ Connected to database\n');
        console.log('Database:', process.env.DATABASE_URL.split('@')[1].split('/')[1]);
        console.log('');

        // ============================================
        // Run all migrations
        // ============================================
        await runMigration(client, 'create-auth-tables.sql', 'Creating authentication tables');
        await runMigration(client, 'create-erp-tables.sql', 'Creating ERP tables');
        await runMigration(client, 'create-financing-requests.sql', 'Creating financing tables');
        await runMigration(client, 'create-notifications-table.sql', 'Creating notifications table');
        await runMigration(client, 'create-activity-log.sql', 'Creating activity log table');
        await runMigration(client, 'create-lender-invoice-access.sql', 'Creating lender access table');
        
        // Run additional migrations
        await runMigration(client, 'add-blockchain-fields.sql', 'Adding blockchain fields');
        await runMigration(client, 'add-document-fields.sql', 'Adding document fields');
        await runMigration(client, 'add-seller-name-column.sql', 'Adding seller name column');
        await runMigration(client, 'add-updated-at-to-erp-connections.sql', 'Adding updated_at to ERP connections');
        await runMigration(client, 'fix-notifications-schema.sql', 'Fixing notifications schema');
        await runMigration(client, 'fix-lender-id-uuid.sql', 'Fixing lender_id to UUID type');

        // ============================================
        // Create Test Accounts
        // ============================================
        console.log('📋 Creating test accounts...\n');
        
        // Hash passwords
        const msmePassword = await bcrypt.hash('msme123', 10);
        const hdfcPassword = await bcrypt.hash('hdfc123', 10);
        const axisPassword = await bcrypt.hash('axis123', 10);
        const bajajPassword = await bcrypt.hash('bajaj123', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);

        // MSME Test Account
        const msmeResult = await client.query(`
            INSERT INTO msme_users (
                email, password_hash, company_name, gstin, 
                contact_person, phone, is_verified
            )
            VALUES (
                'msme@test.com', $1, 'Test MSME Company', '29ABCDE1234F1Z5',
                'MSME Test User', '9876543210', true
            )
            ON CONFLICT (email) DO UPDATE SET password_hash = $1
            RETURNING id;
        `, [msmePassword]);
        console.log('  ✓ MSME: msme@test.com / msme123');

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
            ON CONFLICT (email) DO UPDATE SET password_hash = $1;
        `, [hdfcPassword]);
        console.log('  ✓ HDFC: hdfc@test.com / hdfc123');

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
            ON CONFLICT (email) DO UPDATE SET password_hash = $1;
        `, [axisPassword]);
        console.log('  ✓ Axis: axis@test.com / axis123');

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
            ON CONFLICT (email) DO UPDATE SET password_hash = $1;
        `, [bajajPassword]);
        console.log('  ✓ Bajaj: bajaj@test.com / bajaj123');

        // Admin Account
        await client.query(`
            INSERT INTO regulator_users (
                email, password_hash, full_name, role
            )
            VALUES (
                'admin@test.com', $1, 'System Administrator', 'ADMIN'
            )
            ON CONFLICT (email) DO UPDATE SET password_hash = $1;
        `, [adminPassword]);
        console.log('  ✓ Admin: admin@test.com / admin123');

        console.log('\n✓ All test accounts created\n');

        // ============================================
        // Verify Setup
        // ============================================
        console.log('📋 Verifying database setup...\n');
        
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log(`✓ Total tables: ${tables.rows.length}`);
        
        // Check critical tables
        const criticalTables = ['msme_users', 'lender_users', 'regulator_users', 'invoices', 'financing_requests'];
        const existingTables = tables.rows.map(r => r.table_name);
        
        criticalTables.forEach(table => {
            if (existingTables.includes(table)) {
                console.log(`  ✓ ${table}`);
            } else {
                console.log(`  ✗ ${table} - MISSING!`);
            }
        });

        // Get user counts
        const msmeCount = await client.query('SELECT COUNT(*) FROM msme_users');
        const lenderCount = await client.query('SELECT COUNT(*) FROM lender_users');
        const adminCount = await client.query('SELECT COUNT(*) FROM regulator_users');

        console.log(`\n📊 Account Summary:`);
        console.log(`  - MSME Users: ${msmeCount.rows[0].count}`);
        console.log(`  - Lenders: ${lenderCount.rows[0].count}`);
        console.log(`  - Admins: ${adminCount.rows[0].count}`);

        console.log('\n========================================');
        console.log('✅ Database Setup Complete!');
        console.log('========================================\n');

        console.log('🔐 Test Login Credentials:\n');
        console.log('   MSME:  msme@test.com  / msme123');
        console.log('   HDFC:  hdfc@test.com  / hdfc123');
        console.log('   Axis:  axis@test.com  / axis123');
        console.log('   Bajaj: bajaj@test.com / bajaj123');
        console.log('   Admin: admin@test.com / admin123');
        
        console.log('\n📝 Next Steps:\n');
        console.log('   1. Test backend connection:');
        console.log('      cd invoice-backend && npm start\n');
        console.log('   2. Test login API:');
        console.log('      curl -X POST http://localhost:5000/api/auth/login \\');
        console.log('           -H "Content-Type: application/json" \\');
        console.log('           -d \'{"email":"msme@test.com","password":"msme123","userType":"msme"}\'\n');
        console.log('   3. Start frontend:');
        console.log('      cd client && npm run dev\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error('\nDetails:', error);
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
