/**
 * Layer-5 Verification Engine Test
 * 
 * Tests cryptographic verification of invoice integrity:
 * - Ledger record verification
 * - IPFS document download
 * - Document hash computation and comparison
 * - Binding hash verification
 * 
 * Run: node test-layer5-verification.js
 */

require('dotenv').config();
const axios = require('axios');
const pool = require('./db');

const BASE_URL = 'http://localhost:3000';

async function testLayer5Verification() {
  console.log('🔐 Layer-5 Cryptographic Verification Test\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Find an invoice with complete Layer-3 data
    console.log('\n1️⃣  Finding invoice with complete Layer-3 data...');
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

    // Step 2: Call Layer-5 verification endpoint
    console.log('\n2️⃣  Calling Layer-5 verification endpoint...');
    console.log(`   URL: GET ${BASE_URL}/verify/${giid.substring(0, 16)}...`);

    const startTime = Date.now();
    const response = await axios.get(`${BASE_URL}/verify/${giid}`);
    const duration = Date.now() - startTime;
    const verification = response.data;

    console.log(`   ✓ Response received in ${duration}ms`);
    console.log(`   ✓ Status Code: ${response.status}`);

    // Step 3: Display verification results
    console.log('\n3️⃣  Verification Results:');
    console.log('   ' + '-'.repeat(66));
    console.log(`   GIID:                  ${verification.giid.substring(0, 32)}...`);
    console.log(`   Invoice Number:        ${verification.invoice_number}`);
    console.log(`   Status:                ${verification.status}`);
    console.log(`   Layer:                 ${verification.layer}`);
    console.log('   ' + '-'.repeat(66));
    console.log(`   Ledger Verified:       ${verification.ledger_verified ? '✓ YES' : '✗ NO'}`);
    console.log(`   IPFS Reachable:        ${verification.ipfs_reachable ? '✓ YES' : '✗ NO'}`);
    console.log(`   Document Hash Match:   ${verification.document_hash_match ? '✓ YES' : '✗ NO'}`);
    console.log(`   Binding Hash Match:    ${verification.binding_hash_match ? '✓ YES' : '✗ NO'}`);
    console.log('   ' + '-'.repeat(66));
    console.log(`   VERIFICATION RESULT:   ${verification.verification_result}`);
    console.log('   ' + '-'.repeat(66));

    // Step 4: Display hash details
    if (verification.verification_result === 'TRUSTED') {
      console.log('\n4️⃣  Hash Verification Details:');
      console.log(`   Ledger Document Hash:    ${verification.ledger_document_hash}`);
      console.log(`   Computed Document Hash:  ${verification.computed_document_hash}`);
      console.log(`   Match: ${verification.ledger_document_hash === verification.computed_document_hash ? '✓' : '✗'}`);
      console.log();
      console.log(`   Ledger Binding Hash:     ${verification.ledger_binding_hash}`);
      console.log(`   Computed Binding Hash:   ${verification.computed_binding_hash}`);
      console.log(`   Match: ${verification.ledger_binding_hash === verification.computed_binding_hash ? '✓' : '✗'}`);
      console.log();
      console.log(`   IPFS CID:                ${verification.ipfs_cid}`);
      console.log(`   File Size:               ${verification.file_size} bytes`);
      console.log(`   PDF Signature:           ${verification.pdf_signature}`);
    } else {
      console.log('\n4️⃣  Failure Reason:');
      console.log(`   ${verification.reason}`);
    }

    // Step 5: Test summary
    console.log('\n5️⃣  Test Summary:');
    console.log('   ' + '='.repeat(66));
    
    const allChecks = 
      verification.ledger_verified &&
      verification.ipfs_reachable &&
      verification.document_hash_match &&
      verification.binding_hash_match;

    if (allChecks && verification.verification_result === 'TRUSTED') {
      console.log('   ✅ ALL CHECKS PASSED - INVOICE IS TRUSTED');
      console.log('   ✅ Cryptographic proof verified successfully');
      console.log('   ✅ Layer-5 verification is operational');
    } else {
      console.log('   ⚠️  VERIFICATION FAILED');
      console.log(`   Reason: ${verification.reason}`);
    }

    console.log('   ' + '='.repeat(66));

    // Step 6: Verification flow explanation
    console.log('\n6️⃣  Verification Flow:');
    console.log('   1. Fetch invoice record from ledger (Fabric/PostgreSQL)');
    console.log('   2. Download PDF document from IPFS using CID');
    console.log('   3. Compute SHA-256 hash from downloaded file');
    console.log('   4. Compare computed hash with ledger document_hash');
    console.log('   5. Recompute binding: SHA256(GIID + document_hash)');
    console.log('   6. Compare computed binding with ledger binding_hash');
    console.log('   7. Return TRUSTED if all checks pass, FAILED otherwise');

    console.log('\n' + '='.repeat(70));
    console.log('✅ Layer-5 verification test complete\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.stack);
    }
    
    throw error;
  } finally {
    await pool.end();
  }
}

// Run test
testLayer5Verification()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
