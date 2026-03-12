/**
 * Setup Authentication Database
 * Creates tables and inserts default admin user
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./db');

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';
const SALT_ROUNDS = 10;

async function setupDatabase() {
  console.log('\n========================================');
  console.log('Authentication Database Setup');
  console.log('========================================\n');

  try {
    // Read SQL migration file
    console.log('📄 Reading migration file...');
    const sqlFile = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create-auth-tables.sql'),
      'utf8'
    );

    // Execute migration (without the placeholder INSERT)
    console.log('🔨 Creating tables...');
    const statements = sqlFile.split(';').filter(stmt => {
      const trimmed = stmt.trim();
      return trimmed && !trimmed.includes('$2b$10$placeholder');
    });

    for (const statement of statements) {
      if (statement.trim()) {
        await db.query(statement);
      }
    }

    console.log('✅ Tables created successfully\n');

    // Hash admin password
    console.log('🔐 Hashing admin password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log('✅ Password hashed\n');

    // Insert admin user
    console.log('👤 Creating admin user...');
    const result = await db.query(
      `INSERT INTO regulator_users (email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = $2,
         full_name = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, email, full_name, role, created_at`,
      [ADMIN_EMAIL, passwordHash, 'System Administrator', 'ADMIN', true]
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
    console.log('   ✓ regulator_users');
    console.log('   ✓ refresh_tokens');
    console.log('   ✓ auth_audit_log\n');

    console.log('👤 Admin Account:');
    console.log(`   Email:    ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role:     ${admin.role}`);
    console.log(`   ID:       ${admin.id}`);
    console.log(`   Created:  ${admin.created_at}\n`);

    console.log('🚀 Next Steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Test admin login: POST /api/auth/regulator/login');
    console.log('   3. Register MSME user: POST /api/auth/msme/register');
    console.log('   4. Register Lender user: POST /api/auth/lender/register\n');

    console.log('📚 API Endpoints:');
    console.log('   POST /api/auth/msme/register     - Register MSME');
    console.log('   POST /api/auth/msme/login        - Login MSME');
    console.log('   POST /api/auth/lender/register   - Register Lender');
    console.log('   POST /api/auth/lender/login      - Login Lender');
    console.log('   POST /api/auth/regulator/login   - Login Admin');
    console.log('   POST /api/auth/logout            - Logout');
    console.log('   POST /api/auth/refresh           - Refresh token');
    console.log('   GET  /api/auth/verify            - Verify token\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
