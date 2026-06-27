/**
 * Setup Test Accounts for ChainVoice
 * Creates simple test login accounts for MSME, Lender, and Regulator
 */

const bcrypt = require('bcrypt');
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;

// Simple test credentials
const TEST_ACCOUNTS = {
  msme: {
    email: 'msme@test.com',
    password: 'msme123',
    company_name: 'Test Manufacturing Ltd',
    contact_person: 'MSME Test User',
    phone: '+91-9876543210',
    gstin: '27AAAPZ1234A1Z5'
  },
  lender_hdfc: {
    email: 'hdfc@test.com',
    password: 'hdfc123',
    institution_name: 'HDFC Bank',
    contact_person: 'HDFC Test User',
    phone: '+91-9876543211',
    license_number: 'HDFC-LIC-2024'
  },
  lender_axis: {
    email: 'axis@test.com',
    password: 'axis123',
    institution_name: 'Axis Bank',
    contact_person: 'Axis Test User',
    phone: '+91-9876543212',
    license_number: 'AXIS-LIC-2024'
  },
  lender_bajaj: {
    email: 'bajaj@test.com',
    password: 'bajaj123',
    institution_name: 'Bajaj Finserv',
    contact_person: 'Bajaj Test User',
    phone: '+91-9876543213',
    license_number: 'BAJAJ-LIC-2024'
  },
  regulator: {
    email: 'admin@test.com',
    password: 'admin123',
    full_name: 'Admin Test User',
    role: 'ADMIN'
  }
};

async function setupTestAccounts() {
  console.log('\n========================================');
  console.log('🔧 SETUP TEST ACCOUNTS FOR CHAINVOICE');
  console.log('========================================\n');

  try {
    // 1. Create MSME Test Account
    console.log('1️⃣  Creating MSME Test Account...');
    const msmePasswordHash = await bcrypt.hash(TEST_ACCOUNTS.msme.password, SALT_ROUNDS);
    
    const msmeResult = await db.query(
      `INSERT INTO msme_users (id, company_name, contact_person, email, phone, gstin, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = $7,
         company_name = $2,
         contact_person = $3,
         phone = $5,
         gstin = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, company_name`,
      [
        uuidv4(),
        TEST_ACCOUNTS.msme.company_name,
        TEST_ACCOUNTS.msme.contact_person,
        TEST_ACCOUNTS.msme.email,
        TEST_ACCOUNTS.msme.phone,
        TEST_ACCOUNTS.msme.gstin,
        msmePasswordHash
      ]
    );
    console.log('   ✅ MSME Account Created/Updated');
    console.log(`      Email: ${TEST_ACCOUNTS.msme.email}`);
    console.log(`      Password: ${TEST_ACCOUNTS.msme.password}`);
    console.log(`      Company: ${msmeResult.rows[0].company_name}\n`);

    // 2. Create HDFC Lender Test Account
    console.log('2️⃣  Creating HDFC Bank Test Account...');
    const hdfcPasswordHash = await bcrypt.hash(TEST_ACCOUNTS.lender_hdfc.password, SALT_ROUNDS);
    
    const hdfcResult = await db.query(
      `INSERT INTO lender_users (id, institution_name, contact_person, email, phone, license_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = $7,
         institution_name = $2,
         contact_person = $3,
         phone = $5,
         license_number = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, institution_name`,
      [
        uuidv4(),
        TEST_ACCOUNTS.lender_hdfc.institution_name,
        TEST_ACCOUNTS.lender_hdfc.contact_person,
        TEST_ACCOUNTS.lender_hdfc.email,
        TEST_ACCOUNTS.lender_hdfc.phone,
        TEST_ACCOUNTS.lender_hdfc.license_number,
        hdfcPasswordHash
      ]
    );
    console.log('   ✅ HDFC Bank Account Created/Updated');
    console.log(`      Email: ${TEST_ACCOUNTS.lender_hdfc.email}`);
    console.log(`      Password: ${TEST_ACCOUNTS.lender_hdfc.password}`);
    console.log(`      Institution: ${hdfcResult.rows[0].institution_name}\n`);

    // 3. Create Axis Lender Test Account
    console.log('3️⃣  Creating Axis Bank Test Account...');
    const axisPasswordHash = await bcrypt.hash(TEST_ACCOUNTS.lender_axis.password, SALT_ROUNDS);
    
    const axisResult = await db.query(
      `INSERT INTO lender_users (id, institution_name, contact_person, email, phone, license_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = $7,
         institution_name = $2,
         contact_person = $3,
         phone = $5,
         license_number = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, institution_name`,
      [
        uuidv4(),
        TEST_ACCOUNTS.lender_axis.institution_name,
        TEST_ACCOUNTS.lender_axis.contact_person,
        TEST_ACCOUNTS.lender_axis.email,
        TEST_ACCOUNTS.lender_axis.phone,
        TEST_ACCOUNTS.lender_axis.license_number,
        axisPasswordHash
      ]
    );
    console.log('   ✅ Axis Bank Account Created/Updated');
    console.log(`      Email: ${TEST_ACCOUNTS.lender_axis.email}`);
    console.log(`      Password: ${TEST_ACCOUNTS.lender_axis.password}`);
    console.log(`      Institution: ${axisResult.rows[0].institution_name}\n`);

    // 4. Create Bajaj Lender Test Account
    console.log('4️⃣  Creating Bajaj Finserv Test Account...');
    const bajajPasswordHash = await bcrypt.hash(TEST_ACCOUNTS.lender_bajaj.password, SALT_ROUNDS);
    
    const bajajResult = await db.query(
      `INSERT INTO lender_users (id, institution_name, contact_person, email, phone, license_number, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = $7,
         institution_name = $2,
         contact_person = $3,
         phone = $5,
         license_number = $6,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, institution_name`,
      [
        uuidv4(),
        TEST_ACCOUNTS.lender_bajaj.institution_name,
        TEST_ACCOUNTS.lender_bajaj.contact_person,
        TEST_ACCOUNTS.lender_bajaj.email,
        TEST_ACCOUNTS.lender_bajaj.phone,
        TEST_ACCOUNTS.lender_bajaj.license_number,
        bajajPasswordHash
      ]
    );
    console.log('   ✅ Bajaj Finserv Account Created/Updated');
    console.log(`      Email: ${TEST_ACCOUNTS.lender_bajaj.email}`);
    console.log(`      Password: ${TEST_ACCOUNTS.lender_bajaj.password}`);
    console.log(`      Institution: ${bajajResult.rows[0].institution_name}\n`);

    // 5. Create Regulator Test Account
    console.log('5️⃣  Creating Regulator/Admin Test Account...');
    const regulatorPasswordHash = await bcrypt.hash(TEST_ACCOUNTS.regulator.password, SALT_ROUNDS);
    
    const regulatorResult = await db.query(
      `INSERT INTO regulator_users (id, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = $3,
         full_name = $4,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, full_name`,
      [
        uuidv4(),
        TEST_ACCOUNTS.regulator.email,
        regulatorPasswordHash,
        TEST_ACCOUNTS.regulator.full_name,
        TEST_ACCOUNTS.regulator.role,
        true
      ]
    );
    console.log('   ✅ Regulator Account Created/Updated');
    console.log(`      Email: ${TEST_ACCOUNTS.regulator.email}`);
    console.log(`      Password: ${TEST_ACCOUNTS.regulator.password}`);
    console.log(`      Name: ${regulatorResult.rows[0].full_name}\n`);

    // Display summary
    console.log('========================================');
    console.log('✅ ALL TEST ACCOUNTS CREATED!');
    console.log('========================================\n');

    console.log('📋 TEST LOGIN CREDENTIALS:\n');
    
    console.log('1. MSME (Seller) Login:');
    console.log('   URL: http://localhost:5173/login');
    console.log(`   Email: ${TEST_ACCOUNTS.msme.email}`);
    console.log(`   Password: ${TEST_ACCOUNTS.msme.password}`);
    console.log('   Role: MSME\n');

    console.log('2. HDFC Bank (Lender) Login:');
    console.log('   URL: http://localhost:5173/login');
    console.log(`   Email: ${TEST_ACCOUNTS.lender_hdfc.email}`);
    console.log(`   Password: ${TEST_ACCOUNTS.lender_hdfc.password}`);
    console.log('   Role: Lender\n');

    console.log('3. Axis Bank (Lender) Login:');
    console.log('   URL: http://localhost:5173/login');
    console.log(`   Email: ${TEST_ACCOUNTS.lender_axis.email}`);
    console.log(`   Password: ${TEST_ACCOUNTS.lender_axis.password}`);
    console.log('   Role: Lender\n');

    console.log('4. Bajaj Finserv (Lender) Login:');
    console.log('   URL: http://localhost:5173/login');
    console.log(`   Email: ${TEST_ACCOUNTS.lender_bajaj.email}`);
    console.log(`   Password: ${TEST_ACCOUNTS.lender_bajaj.password}`);
    console.log('   Role: Lender\n');

    console.log('5. Regulator/Admin Login:');
    console.log('   URL: http://localhost:5173/login');
    console.log(`   Email: ${TEST_ACCOUNTS.regulator.email}`);
    console.log(`   Password: ${TEST_ACCOUNTS.regulator.password}`);
    console.log('   Role: Regulator\n');

    console.log('========================================');
    console.log('🚀 NEXT STEPS:');
    console.log('========================================\n');
    console.log('1. Start the backend server:');
    console.log('   npm start\n');
    console.log('2. Start the frontend:');
    console.log('   cd ../client && npm run dev\n');
    console.log('3. Open browser: http://localhost:5173\n');
    console.log('4. Login with any of the credentials above\n');

    console.log('💡 TIP: Save these credentials for easy access!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  }
}

// Run setup
setupTestAccounts();
