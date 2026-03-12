/**
 * Run Blockchain Fields Migration
 * Adds blockchain-related columns to invoices table
 */

const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
  try {
    console.log('🔄 Running blockchain fields migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add-blockchain-fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await db.query(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('Added columns:');
    console.log('  - blockchain_status');
    console.log('  - ipfs_hash');
    console.log('  - document_hash');
    console.log('  - blockchain_tx_hash');
    console.log('  - blockchain_block_number');
    console.log('  - blockchain_timestamp');
    console.log('  - seller_name');
    console.log('  - gst_amount');
    console.log('  - total_amount\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
