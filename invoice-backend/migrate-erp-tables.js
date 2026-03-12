/**
 * Migration Script for ERP Tables
 * Run this to create ERP-related tables in PostgreSQL
 */

const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running ERP tables migration...\n');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'create-erp-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute SQL
    await db.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('Created tables:');
    console.log('  - erp_connections');
    console.log('  - invoices');
    console.log('\nIndexes created:');
    console.log('  - idx_invoices_msme_id');
    console.log('  - idx_invoices_invoice_number');
    console.log('  - idx_invoices_status');
    console.log('  - idx_invoices_giid');
    console.log('  - idx_erp_connections_msme_id');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
