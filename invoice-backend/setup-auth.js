/**
 * Setup Authentication Database
 * Creates tables and inserts default admin user
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');
const { hashPassword } = require('./utils/passwordUtil');

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';

async function setupAuth() {
  console.log('\n========================================');
  console.log('Authentication Database Setup');
  console.log('========================================\n');

  try {
    // Read and execute SQL migration
    console.log('📄 Reading migration file...');
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'migrations', '001_create_auth_tables.sql'),
      'utf8'
    );

    console.log('🔨 Creating tables...');
    await db.query(sqlFile);
    console.log('✅ Tables created successfully\n');

    // Hash admin password
    console.log('🔐 Hashing admin password...');
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    console.log('✅ Password hashed\n');

    // Insert admin user
    console.log('👤 Creating admin user...');
    const result = await db.query(
      `INSERT INTO regulator_admin (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) 
       DO UPDATE SET password_hash = $2, updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, created_at`,
      [ADMIN_EMAIL, passwordHash]
    );

    const admin = result.rows[0];
    console.log('✅ Admin user created/updated\n');

    // Display summary
    console.log('========================================');
    console.log('Setup Complete!');
    console.log('========================================\n');

    console.log('📊 Database Tables Created:');
    console.log('   ✓ msme_users');
    console.log('   ✓ lender_users');
    console.log('   ✓ regulator_admin\n');

    console.log('👤 Admin Account:');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   ID:       ${admin.id}`);
    console.log(`   Created:  ${admin.created_at}\n`);

    console.log('🚀 API Endpoints Available:');
    console.log('   POST /api/auth/msme/register');
    console.log('   POST /api/auth/msme/login');
    console.log('   POST /api/auth/lender/register');
    console.log('   POST /api/auth/lender/login');
    console.log('   POST /api/auth/admin/login');
    console.log('   GET  /api/auth/verify\n');

    console.log('📝 Example MSME Registration:');
    console.log('   POST /api/auth/msme/register');
    console.log('   {');
    console.log('     "company_name": "ABC Corp",');
    console.log('     "contact_person": "John Doe",');
    console.log('     "email": "john@abccorp.com",');
    console.log('     "phone": "9876543210",');
    console.log('     "gstin": "27AAACT2727Q1ZV",');
    console.log('     "password": "securepass123"');
    console.log('   }\n');

    console.log('📝 Example Admin Login:');
    console.log('   POST /api/auth/admin/login');
    console.log('   {');
    console.log('     "email": "admin@gmail.com",');
    console.log('     "password": "admin@123"');
    console.log('   }\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run setup
setupAuth();
