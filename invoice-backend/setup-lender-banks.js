require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

console.log('\n========================================');
console.log('Setup Lender Banks - Clean & Create');
console.log('========================================\n');

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const BANKS = [
    {
        lender_name: 'HDFC Bank',
        lender_type: 'BANK',
        email: 'hdfc@test.com',
        password: 'hdfc123',
        contact_person: 'HDFC Manager',
        phone: '+91-9876543210',
        license_number: 'RBI-HDFC-2024-001'
    },
    {
        lender_name: 'Axis Bank',
        lender_type: 'BANK',
        email: 'axis@test.com',
        password: 'axis123',
        contact_person: 'Axis Manager',
        phone: '+91-9876543211',
        license_number: 'RBI-AXIS-2024-002'
    },
    {
        lender_name: 'SBI Bank',
        lender_type: 'BANK',
        email: 'sbi@test.com',
        password: 'sbi123',
        contact_person: 'SBI Manager',
        phone: '+91-9876543212',
        license_number: 'RBI-SBI-2024-003'
    },
    {
        lender_name: 'Bajaj Finserv',
        lender_type: 'NBFC',
        email: 'bajaj@test.com',
        password: 'bajaj123',
        contact_person: 'Bajaj Manager',
        phone: '+91-9876543213',
        license_number: 'RBI-BAJAJ-2024-004'
    }
];

async function setupBanks() {
    const client = await pool.connect();
    
    try {
        console.log('✓ Connected to database\n');

        // STEP 1: Delete ALL existing lender users
        console.log('📋 Step 1: Cleaning up existing lender accounts...');
        const deleteResult = await client.query('DELETE FROM lender_users RETURNING email');
        console.log(`   Deleted ${deleteResult.rowCount} existing lender account(s)`);
        if (deleteResult.rowCount > 0) {
            deleteResult.rows.forEach(row => {
                console.log(`   - Removed: ${row.email}`);
            });
        }
        console.log('');

        // STEP 2: Create 4 bank accounts
        console.log('📋 Step 2: Creating 4 bank lender accounts...\n');
        
        for (const bank of BANKS) {
            // Hash password
            const password_hash = await bcrypt.hash(bank.password, 10);
            
            // Insert into database
            const result = await client.query(`
                INSERT INTO lender_users (
                    lender_name, 
                    lender_type, 
                    contact_person, 
                    email, 
                    phone, 
                    license_number, 
                    password_hash,
                    is_verified,
                    is_active
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
                RETURNING id, lender_name, email
            `, [
                bank.lender_name,
                bank.lender_type,
                bank.contact_person,
                bank.email,
                bank.phone,
                bank.license_number,
                password_hash
            ]);

            console.log(`✓ ${bank.lender_name} created`);
            console.log(`  Email:    ${bank.email}`);
            console.log(`  Password: ${bank.password}`);
            console.log(`  Type:     ${bank.lender_type}`);
            console.log(`  ID:       ${result.rows[0].id}`);
            console.log('');
        }

        // STEP 3: Verify
        console.log('📋 Step 3: Verifying lender accounts...\n');
        const verifyResult = await client.query(`
            SELECT id, lender_name, lender_type, email, is_verified, is_active
            FROM lender_users
            ORDER BY lender_name
        `);

        console.log(`Total lender accounts: ${verifyResult.rowCount}`);
        console.log('');
        verifyResult.rows.forEach((row, idx) => {
            console.log(`${idx + 1}. ${row.lender_name}`);
            console.log(`   Email:    ${row.email}`);
            console.log(`   Type:     ${row.lender_type}`);
            console.log(`   Verified: ${row.is_verified ? '✓' : '✗'}`);
            console.log(`   Active:   ${row.is_active ? '✓' : '✗'}`);
            console.log('');
        });

        console.log('========================================');
        console.log('✅ Setup Complete!');
        console.log('========================================\n');

        console.log('🔐 Lender Login Credentials:\n');
        console.log('┌─────────────────┬─────────────────────┬──────────────┐');
        console.log('│ Bank            │ Email               │ Password     │');
        console.log('├─────────────────┼─────────────────────┼──────────────┤');
        console.log('│ HDFC Bank       │ hdfc@test.com       │ hdfc123      │');
        console.log('│ Axis Bank       │ axis@test.com       │ axis123      │');
        console.log('│ SBI Bank        │ sbi@test.com        │ sbi123       │');
        console.log('│ Bajaj Finserv   │ bajaj@test.com      │ bajaj123     │');
        console.log('└─────────────────┴─────────────────────┴──────────────┘\n');

        console.log('📝 Next Steps:');
        console.log('   1. Backend is already updated');
        console.log('   2. Login at: http://localhost:5173');
        console.log('   3. Select "Lender" user type');
        console.log('   4. Use any bank credentials above');
        console.log('   5. Review and approve MSME invoices!\n');

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
setupBanks().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
