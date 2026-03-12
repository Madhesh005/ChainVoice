/**
 * Layer-3 IPFS Integration Test Suite
 * 
 * Tests document storage and verification with IPFS.
 * 
 * Test Cases:
 * 1. Test Pinata connection
 * 2. Register invoice with document storage
 * 3. Verify document integrity
 * 4. Check GIID includes document_hash and ipfs_cid
 * 5. Test idempotency (no re-upload on duplicate)
 * 
 * Usage: node test-layer3-ipfs.js <invoice_id>
 */

require('dotenv').config();
const { fetchInvoice, fetchInvoiceLines, fetchPartnerDetails, fetchCompanyDetails } = require('./odooClient');
const { LedgerService } = require('./ledgerService');
const PostgresLedger = require('./postgresLedger');
const { IdentityEngine } = require('./services/identityEngine');
const { IPFSService } = require('./services/ipfsService');
const { DocumentService } = require('./services/documentService');

async function testLayer3Integration(invoiceId) {
  console.log('\n🔬 Layer-3 IPFS Integration Test Suite\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Check IPFS configuration
    console.log('Test 1: IPFS Configuration');
    console.log('-'.repeat(60));

    const ipfsService = new IPFSService();
    
    if (!ipfsService.isConfigured()) {
      console.log('❌ IPFS not configured. Set PINATA_JWT in .env');
      return;
    }

    console.log('✓ IPFS service configured');

    // Test Pinata connection
    const connected = await ipfsService.testConnection();
    if (!connected) {
      console.log('❌ Failed to connect to Pinata');
      return;
    }

    console.log('✓ Pinata connection successful\n');

    // Initialize services
    const ledgerImplementation = new PostgresLedger();
    const ledgerService = new LedgerService(ledgerImplementation);
    const identityEngine = new IdentityEngine(ledgerService);
    const documentService = new DocumentService();

    await ledgerService.init();
    console.log('✓ Services initialized\n');

    // Test 2: Fetch invoice data
    console.log('Test 2: Fetch Invoice Data');
    console.log('-'.repeat(60));

    const invoice = await fetchInvoice(invoiceId);
    const header = invoice[0];

    if (header.state !== 'posted') {
      console.log('❌ Invoice is not posted. Cannot proceed.');
      return;
    }

    console.log(`✓ Invoice: ${header.name}`);
    console.log(`✓ State: ${header.state}`);

    const lines = await fetchInvoiceLines(header.invoice_line_ids);
    const partnerId = Array.isArray(header.partner_id) ? header.partner_id[0] : header.partner_id;
    const companyId = Array.isArray(header.company_id) ? header.company_id[0] : header.company_id;

    const partnerData = await fetchPartnerDetails(partnerId);
    const partner = partnerData[0];
    
    const companyData = await fetchCompanyDetails(companyId);
    const company = companyData[0];

    const buyerGstin = partner.vat ? partner.vat.trim() : null;
    const sellerGstin = company.vat ? company.vat.trim() : null;

    if (!buyerGstin || !sellerGstin) {
      console.log('❌ GSTIN missing. Cannot proceed.');
      return;
    }

    console.log(`✓ Buyer GSTIN: ${buyerGstin}`);
    console.log(`✓ Seller GSTIN: ${sellerGstin}\n`);

    // Test 3: Register invoice with document storage
    console.log('Test 3: Register Invoice with Document Storage');
    console.log('-'.repeat(60));

    const invoiceData = {
      header,
      lines,
      seller_gstin: sellerGstin,
      buyer_gstin: buyerGstin,
      invoiceId: invoiceId
    };

    const identity = await identityEngine.registerInvoice(invoiceData);

    console.log(`✓ GIID: ${identity.giid}`);
    console.log(`✓ Status: ${identity.status}`);
    console.log(`✓ Registered: ${identity.registered}`);
    console.log(`✓ Document Hash: ${identity.document_hash || 'N/A'}`);
    console.log(`✓ IPFS CID: ${identity.ipfs_cid || 'N/A'}`);

    if (!identity.document_hash) {
      console.log('⚠️  No document hash - document storage may have failed');
    }

    if (!identity.ipfs_cid) {
      console.log('⚠️  No IPFS CID - document not uploaded to IPFS');
    }

    if (identity.document_hash && identity.ipfs_cid) {
      console.log('✅ PASS: Document stored successfully\n');
    } else {
      console.log('❌ FAIL: Document storage incomplete\n');
      return;
    }

    const giid = identity.giid;
    const wasNewlyRegistered = identity.registered;

    // Test 4: Verify identity includes document fields
    console.log('Test 4: Verify Identity Includes Document Fields');
    console.log('-'.repeat(60));

    const verification = await identityEngine.verifyInvoice(giid);

    console.log(`✓ GIID: ${verification.giid}`);
    console.log(`✓ Invoice Number: ${verification.invoice_number}`);
    console.log(`✓ Document Hash: ${verification.document_hash}`);
    console.log(`✓ IPFS CID: ${verification.ipfs_cid}`);

    if (verification.document_hash && verification.ipfs_cid) {
      console.log('✅ PASS: Identity includes document fields\n');
    } else {
      console.log('❌ FAIL: Document fields missing from identity\n');
    }

    // Test 5: Verify document integrity
    console.log('Test 5: Verify Document Integrity');
    console.log('-'.repeat(60));

    const integrityCheck = await identityEngine.verifyDocumentIntegrity(giid);

    console.log(`✓ GIID: ${integrityCheck.giid}`);
    console.log(`✓ Integrity: ${integrityCheck.integrity}`);
    console.log(`✓ Stored Hash: ${integrityCheck.stored_hash}`);
    console.log(`✓ Computed Hash: ${integrityCheck.computed_hash}`);
    console.log(`✓ Match: ${integrityCheck.match}`);

    if (integrityCheck.gateway_url) {
      console.log(`✓ Gateway URL: ${integrityCheck.gateway_url}`);
    }

    if (integrityCheck.integrity === 'VALID') {
      console.log('✅ PASS: Document integrity verified\n');
    } else {
      console.log(`❌ FAIL: Document integrity check failed: ${integrityCheck.integrity}\n`);
    }

    // Test 6: Test idempotency (no re-upload)
    console.log('Test 6: Test Idempotency (No Re-upload)');
    console.log('-'.repeat(60));

    const identity2 = await identityEngine.registerInvoice(invoiceData);

    console.log(`✓ GIID: ${identity2.giid}`);
    console.log(`✓ Registered: ${identity2.registered}`);
    console.log(`✓ Document Hash: ${identity2.document_hash}`);
    console.log(`✓ IPFS CID: ${identity2.ipfs_cid}`);

    if (identity2.giid === giid && 
        identity2.registered === false &&
        identity2.document_hash === identity.document_hash &&
        identity2.ipfs_cid === identity.ipfs_cid) {
      console.log('✅ PASS: Idempotency maintained, no re-upload\n');
    } else {
      console.log('❌ FAIL: Idempotency check failed\n');
    }

    // Test 7: Download document from IPFS
    console.log('Test 7: Download Document from IPFS');
    console.log('-'.repeat(60));

    try {
      const buffer = await ipfsService.downloadFile(identity.ipfs_cid);
      console.log(`✓ Downloaded: ${buffer.length} bytes`);
      
      const crypto = require('crypto');
      const downloadedHash = crypto.createHash('sha256').update(buffer).digest('hex');
      console.log(`✓ Downloaded Hash: ${downloadedHash}`);
      
      if (downloadedHash === identity.document_hash) {
        console.log('✅ PASS: Downloaded document matches stored hash\n');
      } else {
        console.log('❌ FAIL: Downloaded document hash mismatch\n');
      }
    } catch (error) {
      console.log(`❌ FAIL: Download failed: ${error.message}\n`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Layer-3 IPFS Integration Test Suite Complete\n');

    console.log('Summary:');
    console.log(`  GIID: ${giid}`);
    console.log(`  Document Hash: ${identity.document_hash}`);
    console.log(`  IPFS CID: ${identity.ipfs_cid}`);
    console.log(`  Gateway URL: ${ipfsService.getGatewayUrl(identity.ipfs_cid)}`);
    console.log(`  Integrity: ${integrityCheck.integrity}`);
    console.log(`  Newly Registered: ${wasNewlyRegistered}\n`);

    if (wasNewlyRegistered) {
      console.log('⚠️  Note: This invoice was newly registered during this test.');
      console.log('   Run the test again to verify idempotency fully.\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Get invoice ID from command line
const invoiceId = process.argv[2];

if (!invoiceId) {
  console.log('Usage: node test-layer3-ipfs.js <invoice_id>');
  console.log('Example: node test-layer3-ipfs.js 40');
  process.exit(1);
}

testLayer3Integration(parseInt(invoiceId))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
