/**
 * Fix Script: Ensure binding_hash Column Exists and Populate Data
 * 
 * This script:
 * 1. Verifies binding_hash column exists
 * 2. Adds column if missing
 * 3. Populates binding_hash for ALL existing records
 * 4. Verifies the fix worked
 * 
 * Run: node fix-binding-hash-persistence.js
 */

require('dotenv').config();
const pool = require('./db');
const crypto = require('crypto');

async function fixBindingHash() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing binding_hash persistence...\n');
    console.log('=' .repeat(60));

    // Step 1: Verify table exists
    console.log('\n1️⃣  Verifying invoice_ledger table exists...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'invoice_ledger';
    `);

    if (tableCheck.rows.length === 0) {
      console.log('   ❌ Table invoice_ledger does not exist!');
      console.log('   ➜ Run server first to create table: node server.js');
      return;
    }
    console.log('   ✓ Table invoice_ledger exists');

    // Step 2: Check if binding_hash column exists
    console.log('\n2️⃣  Checking if binding_hash column exists...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger' 
      AND column_name = 'binding_hash';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('   ➜ Column does not exist, creating...');
      await client.query(`
        ALTER TABLE invoice_ledger 
        ADD COLUMN binding_hash VARCHAR(64);
      `);
      console.log('   ✓ Column binding_hash created');
    } else {
      console.log('   ✓ Column binding_hash already exists');
    }

    // Step 3: Count records needing binding_hash
    console.log('\n3️⃣  Analyzing records...');
    const analysis = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(document_hash) as with_doc_hash,
        COUNT(binding_hash) as with_binding,
        COUNT(*) FILTER (WHERE document_hash IS NOT NULL AND binding_hash IS NULL) as need_binding
      FROM invoice_ledger;
    `);

    const stats = analysis.rows[0];
    console.log(`   Total records: ${stats.total}`);
    console.log(`   With document_hash: ${stats.with_doc_hash}`);
    console.log(`   With binding_hash: ${stats.with_binding}`);
    console.log(`   Need binding_hash: ${stats.need_binding}`);

    if (parseInt(stats.need_binding) === 0) {
      console.log('\n✅ All records already have binding_hash!');
      
      // Show sample
      const sample = await client.query(`
        SELECT invoice_hash, invoice_number, binding_hash
        FROM invoice_ledger
        WHERE binding_hash IS NOT NULL
        LIMIT 1;
      `);
      
      if (sample.rows.length > 0) {
        console.log('\n📋 Sample record:');
        console.log(`   Invoice: ${sample.rows[0].invoice_number}`);
        console.log(`   GIID: ${sample.rows[0].invoice_hash.substring(0, 32)}...`);
        console.log(`   Binding Hash: ${sample.rows[0].binding_hash.substring(0, 32)}...`);
      }
      
      return;
    }

    // Step 4: Populate binding_hash for records that need it
    console.log('\n4️⃣  Populating binding_hash...');
    
    const recordsToFix = await client.query(`
      SELECT invoice_hash, document_hash
      FROM invoice_ledger
      WHERE document_hash IS NOT NULL 
      AND binding_hash IS NULL;
    `);

    console.log(`   Found ${recordsToFix.rows.length} records to fix`);

    let fixed = 0;
    for (const record of recordsToFix.rows) {
      const giid = record.invoice_hash;
      const documentHash = record.document_hash;

      // Generate binding hash: SHA256(giid + document_hash)
      const bindingHash = crypto
        .createHash('sha256')
        .update(giid + documentHash)
        .digest('hex');

      // Update record
      const updateResult = await client.query(
        `UPDATE invoice_ledger 
         SET binding_hash = $1 
         WHERE invoice_hash = $2 
         AND binding_hash IS NULL;`,
        [bindingHash, giid]
      );

      if (updateResult.rowCount > 0) {
        fixed++;
        console.log(`   ✓ Fixed ${giid.substring(0, 16)}... → ${bindingHash.substring(0, 16)}...`);
      }
    }

    console.log(`\n   ✅ Fixed ${fixed} records`);

    // Step 5: Verify the fix
    console.log('\n5️⃣  Verifying fix...');
    const verification = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(binding_hash) as with_binding,
        COUNT(*) FILTER (WHERE document_hash IS NOT NULL AND binding_hash IS NULL) as still_missing
      FROM invoice_ledger;
    `);

    const verifyStats = verification.rows[0];
    console.log(`   Total records: ${verifyStats.total}`);
    console.log(`   With binding_hash: ${verifyStats.with_binding}`);
    console.log(`   Still missing: ${verifyStats.still_missing}`);

    if (parseInt(verifyStats.still_missing) === 0) {
      console.log('\n✅ SUCCESS! All records now have binding_hash');
    } else {
      console.log(`\n⚠️  WARNING: ${verifyStats.still_missing} records still missing binding_hash`);
    }

    // Step 6: Show sample of fixed data
    console.log('\n6️⃣  Sample of fixed data:');
    const samples = await client.query(`
      SELECT invoice_hash, invoice_number, document_hash, binding_hash
      FROM invoice_ledger
      WHERE binding_hash IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 2;
    `);

    samples.rows.forEach((row, idx) => {
      console.log(`\n   Record ${idx + 1}:`);
      console.log(`     Invoice: ${row.invoice_number}`);
      console.log(`     GIID: ${row.invoice_hash.substring(0, 32)}...`);
      console.log(`     Document Hash: ${row.document_hash.substring(0, 32)}...`);
      console.log(`     Binding Hash: ${row.binding_hash.substring(0, 32)}...`);
      
      // Verify binding is correct
      const expectedBinding = crypto
        .createHash('sha256')
        .update(row.invoice_hash + row.document_hash)
        .digest('hex');
      
      const isCorrect = expectedBinding === row.binding_hash;
      console.log(`     Verification: ${isCorrect ? '✓ CORRECT' : '✗ INCORRECT'}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ Fix complete!\n');
    console.log('Next steps:');
    console.log('  1. Restart server: node server.js');
    console.log('  2. Test verification: GET /verify-document/:giid');
    console.log('  3. Expected result: "integrity": "VALID", "binding_match": true\n');

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run fix
fixBindingHash()
  .then(() => {
    console.log('Fix script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fix script failed:', error);
    process.exit(1);
  });
