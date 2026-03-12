/**
 * Binary Handling Test
 * 
 * Tests that IPFS download and hash computation work correctly with binary data.
 * 
 * Usage: node test-binary-handling.js <giid>
 */

require('dotenv').config();
const { IPFSService } = require('./services/ipfsService');
const { DocumentService } = require('./services/documentService');
const { LedgerService } = require('./ledgerService');
const PostgresLedger = require('./postgresLedger');
const crypto = require('crypto');

async function testBinaryHandling(giid) {
  console.log('\n🧪 Binary Handling Test\n');
  console.log('='.repeat(60));

  try {
    // Initialize services
    const ledgerImplementation = new PostgresLedger();
    const ledgerService = new LedgerService(ledgerImplementation);
    const documentService = new DocumentService();
    const ipfsService = new IPFSService();

    await ledgerService.init();

    // Test 1: Get invoice from ledger
    console.log('\n1️⃣  Fetching invoice from ledger...');
    const invoice = await ledgerService.verifyInvoice(giid);

    if (!invoice.found) {
      console.log('❌ Invoice not found in ledger');
      return;
    }

    console.log(`✓ Invoice found: ${invoice.invoice_number}`);
    console.log(`✓ Stored Hash: ${invoice.document_hash}`);
    console.log(`✓ IPFS CID: ${invoice.ipfs_cid}`);

    if (!invoice.ipfs_cid) {
      console.log('❌ No IPFS CID available');
      return;
    }

    // Test 2: Download from IPFS
    console.log('\n2️⃣  Downloading from IPFS...');
    const buffer = await ipfsService.downloadFile(invoice.ipfs_cid);

    console.log(`✓ Downloaded: ${buffer.length} bytes`);
    console.log(`✓ Buffer type: ${buffer.constructor.name}`);
    console.log(`✓ Is Buffer: ${Buffer.isBuffer(buffer)}`);

    // Test 3: Validate PDF signature
    console.log('\n3️⃣  Validating PDF signature...');
    const signature = buffer.slice(0, 5).toString('ascii');
    console.log(`✓ First 5 bytes: ${signature}`);
    console.log(`✓ First 20 bytes (hex): ${buffer.slice(0, 20).toString('hex')}`);
    console.log(`✓ First 20 bytes (ascii): ${buffer.slice(0, 20).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);

    if (signature !== '%PDF-') {
      console.log(`❌ Invalid PDF signature: ${signature}`);
      return;
    }

    console.log(`✓ PDF signature valid: ${signature}`);

    // Test 4: Compute hash
    console.log('\n4️⃣  Computing SHA-256 hash...');
    const computedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`✓ Computed Hash: ${computedHash}`);

    // Test 5: Compare hashes
    console.log('\n5️⃣  Comparing hashes...');
    console.log(`   Stored Hash:   ${invoice.document_hash}`);
    console.log(`   Computed Hash: ${computedHash}`);

    const match = computedHash === invoice.document_hash;
    console.log(`   Match: ${match}`);

    if (match) {
      console.log('\n✅ SUCCESS: Binary handling is correct!');
      console.log('   Integrity: VALID');
    } else {
      console.log('\n❌ FAILURE: Hashes do not match');
      console.log('   Integrity: TAMPERED');
      
      // Debug info
      console.log('\n🔍 Debug Information:');
      console.log(`   Stored hash length: ${invoice.document_hash.length}`);
      console.log(`   Computed hash length: ${computedHash.length}`);
      console.log(`   File size: ${buffer.length} bytes`);
      
      // Check if hashes differ
      if (invoice.document_hash.length !== computedHash.length) {
        console.log('   ⚠️  Hash lengths differ - possible encoding issue');
      }
      
      // Show first difference
      for (let i = 0; i < Math.min(invoice.document_hash.length, computedHash.length); i++) {
        if (invoice.document_hash[i] !== computedHash[i]) {
          console.log(`   ⚠️  First difference at position ${i}:`);
          console.log(`      Stored: ${invoice.document_hash.substring(i, i + 10)}`);
          console.log(`      Computed: ${computedHash.substring(i, i + 10)}`);
          break;
        }
      }
    }

    // Test 6: Full verification via documentService
    console.log('\n6️⃣  Testing full verification flow...');
    const verification = await documentService.verifyDocument(
      giid,
      invoice.document_hash,
      invoice.ipfs_cid
    );

    console.log(`✓ Integrity: ${verification.integrity}`);
    console.log(`✓ Match: ${verification.match}`);
    console.log(`✓ File Size: ${verification.file_size}`);
    console.log(`✓ PDF Signature: ${verification.pdf_signature}`);

    if (verification.integrity === 'VALID') {
      console.log('\n✅ FULL VERIFICATION PASSED!');
    } else {
      console.log(`\n❌ FULL VERIFICATION FAILED: ${verification.integrity}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Test Summary:');
    console.log(`  GIID: ${giid}`);
    console.log(`  Invoice: ${invoice.invoice_number}`);
    console.log(`  File Size: ${buffer.length} bytes`);
    console.log(`  PDF Valid: ${signature === '%PDF-'}`);
    console.log(`  Hash Match: ${match}`);
    console.log(`  Integrity: ${verification.integrity}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Get GIID from command line
const giid = process.argv[2];

if (!giid) {
  console.log('Usage: node test-binary-handling.js <giid>');
  console.log('Example: node test-binary-handling.js 130d6a316a42afff...');
  process.exit(1);
}

testBinaryHandling(giid)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
