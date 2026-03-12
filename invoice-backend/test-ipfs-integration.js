/**
 * IPFS Integration Test Suite
 * 
 * Tests Layer-3 off-chain storage with IPFS/Pinata
 * 
 * Test Cases:
 * 1. Fetch invoice PDF from Odoo
 * 2. Generate document hash
 * 3. Upload to IPFS
 * 4. Store in ledger
 * 5. Verify document integrity
 * 
 * Usage: node test-ipfs-integration.js <invoice_id>
 */

require('dotenv').config();
const { DocumentService } = require('./services/documentService');
const { IPFSService } = require('./services/ipfsService');
const { LedgerService } = require('./ledgerService');
const PostgresLedger = require('./postgresLedger');
const { IdentityEngine } = require('./services/identityEngine');

async function testIPFSIntegration(invoiceId) {
  console.log('\n🔬 IPFS Integration Test Suite\n');
  console.log('='.repeat(60));

  try {
    // Initialize services
    const documentService = new DocumentService();
    const ipfsService = new IPFSService();
    const ledgerImplementation = new PostgresLedger();
    const ledgerService = new LedgerService(ledgerImplementation);
    const identityEngine = new IdentityEngine(ledgerService);

    await ledgerService.init();
    console.log('✓ Services initialized\n');

    // Check IPFS configuration
    console.log('Configuration Check:');
    console.log('-'.repeat(60));
    console.log(`IPFS Configured: ${ipfsService.isConfigured()}`);
    console.log(`IPFS Gateway: ${ipfsService.ipfsGateway}`);
    
    if (!ipfsService.isConfigured()) {
      console.log('\n⚠️  PINATA_JWT not configured in .env');
      console.log('   Set PINATA_JWT to test IPFS uploads\n');
    }
    console.log();

    // Test 1: Fetch PDF from Odoo
    console.log('Test 1: Fetch Invoice PDF from Odoo');
    console.log('-'.repeat(60));

    const pdfBuffer = await documentService.fetchInvoicePDF(invoiceId);
    console.log(`✓ PDF fetched successfully`);
    console.log(`  Size: ${pdfBuffer.length} bytes`);
    console.log(`  Type: ${Buffer.isBuffer(pdfBuffer) ? 'Buffer' : 'Unknown'}\n`);

    // Test 2: Generate document hash
    console.log('Test 2: Generate Document Hash');
    console.log('-'.repeat(60));

    const documentHash = documentService.generateDocumentHash(pdfBuffer);
    console.log(`✓ Document hash generated`);
    console.log(`  Hash: ${documentHash}`);
    console.log(`  Algorithm: SHA-256\n`);

    // Test 3: Upload to IPFS (if configured)
    console.log('Test 3: Upload to IPFS');
    console.log('-'.repeat(60));

    if (!ipfsService.isConfigured()) {
      console.log('⚠️  Skipped: IPFS not configured\n');
    } else {
      try {
        const filename = `test_invoice_${invoiceId}.pdf`;
        const metadata = {
          invoice_id: invoiceId.toString(),
          document_hash: documentHash,
          test: true
        };

        const result = await ipfsService.uploadFile(pdfBuffer, filename, metadata);
        console.log(`✓ Uploaded to IPFS`);
        console.log(`  CID: ${result.cid}`);
        console.log(`  Size: ${result.size} bytes`);
        console.log(`  Timestamp: ${result.timestamp}`);
        console.log(`  Gateway URL: ${ipfsService.getGatewayURL(result.cid)}\n`);

        // Test 4: Download from IPFS
        console.log('Test 4: Download from IPFS');
        console.log('-'.repeat(60));

        const downloadedBuffer = await ipfsService.downloadFile(result.cid);
        console.log(`✓ Downloaded from IPFS`);
        console.log(`  Size: ${downloadedBuffer.length} bytes\n`);

        // Test 5: Verify integrity
        console.log('Test 5: Verify Document Integrity');
        console.log('-'.repeat(60));

        const downloadedHash = documentService.generateDocumentHash(downloadedBuffer);
        const isValid = downloadedHash === documentHash;

        console.log(`  Original hash:   ${documentHash}`);
        console.log(`  Downloaded hash: ${downloadedHash}`);
        console.log(`  Match: ${isValid ? '✅ YES' : '❌ NO'}`);

        if (isValid) {
          console.log('✅ PASS: Document integrity verified\n');
        } else {
          console.log('❌ FAIL: Document integrity check failed\n');
        }

      } catch (error) {
        console.error(`❌ IPFS test failed: ${error.message}\n`);
      }
    }

    // Test 6: Full integration with storeDocument
    console.log('Test 6: Full Document Storage Flow');
    console.log('-'.repeat(60));

    const mockGIID = 'test_' + Date.now();
    const docResult = await documentService.storeDocument(mockGIID, invoiceId);

    console.log(`✓ Document storage completed`);
    console.log(`  Document Hash: ${docResult.document_hash || 'N/A'}`);
    console.log(`  IPFS CID: ${docResult.ipfs_cid || 'N/A'}`);
    console.log(`  Size: ${docResult.size || 'N/A'} bytes`);
    
    if (docResult.error) {
      console.log(`  Error: ${docResult.error}`);
    }
    console.log();

    // Summary
    console.log('='.repeat(60));
    console.log('✅ IPFS Integration Test Suite Complete\n');

    if (!ipfsService.isConfigured()) {
      console.log('⚠️  Note: IPFS uploads were skipped (not configured)');
      console.log('   To test uploads, set PINATA_JWT in .env\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Get invoice ID from command line
const invoiceId = process.argv[2];

if (!invoiceId) {
  console.log('Usage: node test-ipfs-integration.js <invoice_id>');
  console.log('Example: node test-ipfs-integration.js 40');
  process.exit(1);
}

testIPFSIntegration(parseInt(invoiceId))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
