/**
 * Diagnostic Script: Check binding_hash Column and Data
 * 
 * This script checks:
 * 1. If binding_hash column exists
 * 2. Current data in the table
 * 3. Which records have binding_hash
 * 
 * Run: node diagnose-binding-hash.js
 */

require('dotenv').config();
const pool = require('./db');

async function diagnose() {
  console.log('🔍 Diagnosing binding_hash persistence...\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Check if column exists
    console.log('\n1️⃣  Checking if binding_hash column exists...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger' 
      AND column_name = 'binding_hash';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('   ❌ Column binding_hash does NOT exist!');
      console.log('   ➜ Run: ALTER TABLE invoice_ledger ADD COLUMN binding_hash VARCHAR(64);');
      return;
    } else {
      const col = columnCheck.rows[0];
      console.log(`   ✓ Column exists: ${col.column_name} ${col.data_type}(${col.character_maximum_length})`);
    }

    // Step 2: Check all columns in table
    console.log('\n2️⃣  Current table schema:');
    const schemaCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'invoice_ledger'
      ORDER BY ordinal_position;
    `);

    schemaCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Step 3: Count records
    console.log('\n3️⃣  Record statistics:');
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(document_hash) as with_document_hash,
        COUNT(ipfs_cid) as with_ipfs_cid,
        COUNT(binding_hash) as with_binding_hash,
        COUNT(*) FILTER (WHERE binding_hash IS NULL AND document_hash IS NOT NULL) as missing_binding
      FROM invoice_ledger;
    `);

    const s = stats.rows[0];
    console.log(`   Total records: ${s.total_records}`);
    console.log(`   With document_hash: ${s.with_document_hash}`);
    console.log(`   With ipfs_cid: ${s.with_ipfs_cid}`);
    console.log(`   With binding_hash: ${s.with_binding_hash}`);
    console.log(`   Missing binding_hash (but have document_hash): ${s.missing_binding}`);

    // Step 4: Show sample records
    console.log('\n4️⃣  Sample records (first 3):');
    const samples = await pool.query(`
      SELECT 
        invoice_hash,
        invoice_number,
        CASE WHEN document_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_doc_hash,
        CASE WHEN ipfs_cid IS NOT NULL THEN 'YES' ELSE 'NO' END as has_cid,
        CASE WHEN binding_hash IS NOT NULL THEN 'YES' ELSE 'NO' END as has_binding,
        created_at
      FROM invoice_ledger
      ORDER BY created_at DESC
      LIMIT 3;
    `);

    if (samples.rows.length === 0) {
      console.log('   No records found in table');
    } else {
      samples.rows.forEach((row, idx) => {
        console.log(`\n   Record ${idx + 1}:`);
        console.log(`     Invoice: ${row.invoice_number}`);
        console.log(`     GIID: ${row.invoice_hash.substring(0, 32)}...`);
        console.log(`     Has document_hash: ${row.has_doc_hash}`);
        console.log(`     Has ipfs_cid: ${row.has_cid}`);
        console.log(`     Has binding_hash: ${row.has_binding}`);
        console.log(`     Created: ${row.created_at}`);
      });
    }

    // Step 5: Show full data for one record with document
    console.log('\n5️⃣  Full data for one record with document:');
    const fullRecord = await pool.query(`
      SELECT *
      FROM invoice_ledger
      WHERE document_hash IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
    `);

    if (fullRecord.rows.length === 0) {
      console.log('   No records with document_hash found');
    } else {
      const rec = fullRecord.rows[0];
      console.log(`   Invoice Number: ${rec.invoice_number}`);
      console.log(`   GIID: ${rec.invoice_hash}`);
      console.log(`   Document Hash: ${rec.document_hash || 'NULL'}`);
      console.log(`   IPFS CID: ${rec.ipfs_cid || 'NULL'}`);
      console.log(`   Binding Hash: ${rec.binding_hash || 'NULL'}`);
      console.log(`   Status: ${rec.status}`);
      console.log(`   Created: ${rec.created_at}`);
    }

    // Step 6: Recommendations
    console.log('\n6️⃣  Recommendations:');
    if (parseInt(s.missing_binding) > 0) {
      console.log(`   ⚠️  ${s.missing_binding} records need binding_hash populated`);
      console.log('   ➜ Run: node migrate-add-binding-hash.js');
    } else if (parseInt(s.with_binding_hash) === 0 && parseInt(s.total_records) > 0) {
      console.log('   ⚠️  No records have binding_hash yet');
      console.log('   ➜ Register a new invoice to test: POST /invoice/:id');
    } else if (parseInt(s.with_binding_hash) > 0) {
      console.log(`   ✓ ${s.with_binding_hash} records have binding_hash`);
      console.log('   ✓ System is working correctly');
    } else {
      console.log('   ℹ️  No records in database yet');
      console.log('   ➜ Register an invoice to test: POST /invoice/:id');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnosis complete\n');

  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run diagnosis
diagnose()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnosis failed:', error);
    process.exit(1);
  });
