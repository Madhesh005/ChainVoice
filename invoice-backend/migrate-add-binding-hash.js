/**
 * Migration Script: Add and Populate binding_hash Column
 * 
 * This script:
 * 1. Adds binding_hash column if it doesn't exist
 * 2. Populates binding_hash for existing records using SHA256(giid + document_hash)
 * 
 * Run: node migrate-add-binding-hash.js
 */

require('dotenv').config();
const pool = require('./db');
const crypto = require('crypto');

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting binding_hash migration...\n');

    // Step 1: Check if binding_hash column exists
    console.log('1️⃣  Checking if binding_hash column exists...');
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger' 
      AND column_name = 'binding_hash';
    `);

    if (checkColumn.rows.length === 0) {
      console.log('   ➜ Column does not exist, creating...');
      await client.query(`
        ALTER TABLE invoice_ledger 
        ADD COLUMN binding_hash VARCHAR(64);
      `);
      console.log('   ✓ Column binding_hash created\n');
    } else {
      console.log('   ✓ Column binding_hash already exists\n');
    }

    // Step 2: Find records with missing binding_hash
    console.log('2️⃣  Finding records with missing binding_hash...');
    const missingBindings = await client.query(`
      SELECT invoice_hash, document_hash 
      FROM invoice_ledger 
      WHERE binding_hash IS NULL 
      AND document_hash IS NOT NULL;
    `);

    console.log(`   ➜ Found ${missingBindings.rows.length} records without binding_hash\n`);

    if (missingBindings.rows.length === 0) {
      console.log('✅ All records already have binding_hash. Migration complete!\n');
      return;
    }

    // Step 3: Populate binding_hash for each record
    console.log('3️⃣  Populating binding_hash for existing records...');
    
    let updated = 0;
    for (const record of missingBindings.rows) {
      const giid = record.invoice_hash;
      const documentHash = record.document_hash;

      // Generate binding hash: SHA256(giid + document_hash)
      const bindingHash = crypto
        .createHash('sha256')
        .update(giid + documentHash)
        .digest('hex');

      // Update record
      await client.query(
        `UPDATE invoice_ledger 
         SET binding_hash = $1 
         WHERE invoice_hash = $2;`,
        [bindingHash, giid]
      );

      updated++;
      console.log(`   ✓ Updated ${giid.substring(0, 16)}... → ${bindingHash.substring(0, 16)}...`);
    }

    console.log(`\n✅ Migration complete! Updated ${updated} records.\n`);

    // Step 4: Verify migration
    console.log('4️⃣  Verifying migration...');
    const verification = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(binding_hash) as with_binding,
        COUNT(*) FILTER (WHERE binding_hash IS NULL AND document_hash IS NOT NULL) as missing_binding
      FROM invoice_ledger;
    `);

    const stats = verification.rows[0];
    console.log(`   Total records: ${stats.total}`);
    console.log(`   With binding_hash: ${stats.with_binding}`);
    console.log(`   Missing binding_hash: ${stats.missing_binding}`);

    if (parseInt(stats.missing_binding) === 0) {
      console.log('\n✅ All records with document_hash now have binding_hash!\n');
    } else {
      console.log('\n⚠️  Some records still missing binding_hash\n');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
