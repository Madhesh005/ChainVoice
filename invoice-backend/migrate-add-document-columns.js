/**
 * Database Migration: Add Document Columns
 * 
 * Adds document_hash and ipfs_cid columns to invoice_ledger table
 * for Layer-3 IPFS integration.
 * 
 * Usage: node migrate-add-document-columns.js
 */

require('dotenv').config();
const pool = require('./db');

async function migrate() {
  console.log('\n🔄 Starting database migration...\n');

  try {
    // Check if columns already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger' 
      AND column_name IN ('document_hash', 'ipfs_cid');
    `;

    const existingColumns = await pool.query(checkQuery);
    
    if (existingColumns.rows.length === 2) {
      console.log('✅ Columns already exist. No migration needed.');
      console.log('   - document_hash: EXISTS');
      console.log('   - ipfs_cid: EXISTS\n');
      process.exit(0);
    }

    console.log('📋 Current columns:', existingColumns.rows.map(r => r.column_name));
    console.log('🔧 Adding missing columns...\n');

    // Add document_hash column if not exists
    if (!existingColumns.rows.find(r => r.column_name === 'document_hash')) {
      await pool.query(`
        ALTER TABLE invoice_ledger 
        ADD COLUMN document_hash TEXT;
      `);
      console.log('✅ Added column: document_hash');
    } else {
      console.log('✓ Column already exists: document_hash');
    }

    // Add ipfs_cid column if not exists
    if (!existingColumns.rows.find(r => r.column_name === 'ipfs_cid')) {
      await pool.query(`
        ALTER TABLE invoice_ledger 
        ADD COLUMN ipfs_cid TEXT;
      `);
      console.log('✅ Added column: ipfs_cid');
    } else {
      console.log('✓ Column already exists: ipfs_cid');
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger' 
      AND column_name IN ('document_hash', 'ipfs_cid')
      ORDER BY column_name;
    `;

    const verification = await pool.query(verifyQuery);
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('Updated schema:');
    verification.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log('\n🎉 Database is ready for Layer-3 IPFS integration!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate();
