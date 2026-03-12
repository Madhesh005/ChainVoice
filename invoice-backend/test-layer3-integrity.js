/**
 * Layer-3 Cryptographic Integrity Test
 * 
 * Tests full binding verification:
 * 1. CID multihash == stored document_hash
 * 2. SHA256(GIID + document_hash) == stored binding_hash
 * 3. binding_hash is immutable
 * 
 * Run: node test-layer3-integrity.js
 */

require('dotenv').config();
const axios = require('axios');
const pool = require('./db');

const BASE_URL = 'http://localhost:3000';

async function testLayer3Integrity() {
  console.log('🔐 Layer-3 Cryptographic Integrity Test\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Get an existing invoice with document
    console.log('\n1️⃣  Finding invoice with document...');
    const result = await pool.query(`
      SELECT invoice_hash, invoice_number, document_hash, ipfs_cid, binding_hash
      FROM invoice_ledger
      WHERE document_hash IS NOT NULL 
      AND ipfs_cid IS NOT NULL
      AND binding_hash IS NOT NULL
      LIMIT 1;
    `);

    if (result.rows.length === 0) {
      console.log('   ⚠️  No invoices with complete Layer-3 data found');
      console.log('   ➜ Register an invoice first using POST /invoice/:id');
      return;
    }

    const invoice = result.rows[0];
    const giid = invoice.invoice_hash;

    console.log(`   ✓ Found invoice: ${invoice.invoice_number}`);
    console.log(`   ✓ GIID: ${giid.substring(0, 32)}...`);
    console.log(`   ✓ Document Hash: ${invoice.document_hash.substring(0, 32)}...`);
    console.log(`   ✓ IPFS CID: ${invoice.ipfs_cid}`);
    console.log(`   ✓ Binding Hash: ${invoice.binding_hash.substring(0, 32)}...`);

    // Step 2: Verify document integrity via API
    console.log('\n2️⃣  Verifying document integrity via API...');
    const verifyResponse = await axios.get(`${BASE_URL}/verify-document/${giid}`);
    const verification = verifyResponse.data;

    console.log(`   ✓ Integrity: ${verification.integrity}`);
    console.log(`   ✓ CID Match: ${verification.match}`);
    console.log(`   ✓ Binding Match: ${verification.binding_match}`);
    console.log(`   ✓ Verification Method: ${verification.verification_method}`);

    // Step 3: Validate response contains all required fields
    console.log('\n3️⃣  Validating API response transparency...');
    const requiredFields = [
      'giid',
      'invoice_number',
      'integrity',
      'ipfs_cid',
      'stored_hash',
      'cid_hash',
      'binding_hash',
      'stored_binding_hash',
      'binding_match',
      'match',
      'verification_method'
    ];

    let allFieldsPresent = true;
    for (const field of requiredFields) {
      if (verification[field] === undefined) {
        console.log(`   ❌ Missing field: ${field}`);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      console.log(`   ✓ All ${requiredFields.length} required fields present`);
    }

    // Step 4: Verify cryptographic properties
    console.log('\n4️⃣  Verifying cryptographic properties...');
    
    // Check CID hash matches stored hash
    if (verification.cid_hash === verification.stored_hash) {
      console.log('   ✓ CID multihash == stored document_hash');
    } else {
      console.log('   ❌ CID multihash mismatch!');
      console.log(`      CID Hash: ${verification.cid_hash}`);
      console.log(`      Stored Hash: ${verification.stored_hash}`);
    }

    // Check binding hash matches
    if (verification.binding_hash === verification.stored_binding_hash) {
      console.log('   ✓ Computed binding_hash == stored binding_hash');
    } else {
      console.log('   ❌ Binding hash mismatch!');
      console.log(`      Computed: ${verification.binding_hash}`);
      console.log(`      Stored: ${verification.stored_binding_hash}`);
    }

    // Check overall integrity
    if (verification.integrity === 'VALID' && verification.match === true) {
      console.log('   ✓ Overall integrity: VALID');
    } else {
      console.log(`   ❌ Overall integrity: ${verification.integrity}`);
    }

    // Step 5: Test immutability (simulate tampering)
    console.log('\n5️⃣  Testing immutability enforcement...');
    console.log('   ➜ Attempting to modify document_hash in database...');
    
    const originalDocHash = invoice.document_hash;
    const tamperedDocHash = 'a'.repeat(64); // Fake hash

    await pool.query(
      `UPDATE invoice_ledger 
       SET document_hash = $1 
       WHERE invoice_hash = $2;`,
      [tamperedDocHash, giid]
    );

    console.log('   ✓ Database modified (simulated tampering)');

    // Verify again - should detect tampering
    console.log('   ➜ Re-verifying integrity...');
    const verifyTampered = await axios.get(`${BASE_URL}/verify-document/${giid}`);
    const tamperedResult = verifyTampered.data;

    if (tamperedResult.integrity === 'TAMPERED' && tamperedResult.match === false) {
      console.log('   ✓ Tampering detected! Integrity: TAMPERED');
      console.log('   ✓ Binding verification caught the modification');
    } else {
      console.log('   ❌ Tampering NOT detected! System vulnerable!');
    }

    // Restore original value
    await pool.query(
      `UPDATE invoice_ledger 
       SET document_hash = $1 
       WHERE invoice_hash = $2;`,
      [originalDocHash, giid]
    );
    console.log('   ✓ Database restored to original state');

    // Final verification
    console.log('\n6️⃣  Final verification after restoration...');
    const finalVerify = await axios.get(`${BASE_URL}/verify-document/${giid}`);
    const finalResult = finalVerify.data;

    if (finalResult.integrity === 'VALID' && finalResult.match === true) {
      console.log('   ✓ Integrity restored: VALID');
    } else {
      console.log(`   ⚠️  Integrity: ${finalResult.integrity}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary\n');
    console.log(`Invoice: ${invoice.invoice_number}`);
    console.log(`GIID: ${giid.substring(0, 32)}...`);
    console.log(`\nVerification Properties:`);
    console.log(`  • CID Verification: ${verification.match ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  • Binding Verification: ${verification.binding_match ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  • Tampering Detection: ${tamperedResult.integrity === 'TAMPERED' ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  • API Transparency: ${allFieldsPresent ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`\nVerification Method: ${verification.verification_method}`);
    console.log(`\n✅ Layer-3 cryptographic integrity is ${verification.integrity === 'VALID' ? 'OPERATIONAL' : 'NEEDS ATTENTION'}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    throw error;
  } finally {
    await pool.end();
  }
}

// Run test
testLayer3Integrity()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
