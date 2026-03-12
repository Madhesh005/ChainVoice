/**
 * Identity Integrity Test Suite
 * 
 * Tests GIID (Global Invoice ID) semantics and immutability
 * 
 * Test Cases:
 * 1. Register invoice - should create new GIID
 * 2. Re-register same invoice - should return existing GIID (no duplicate)
 * 3. Modify invoice data - should generate different GIID
 * 4. Verify GIID uniqueness constraint
 * 5. Test deterministic ordering
 * 
 * Usage: node test-identity-integrity.js <invoice_id>
 */

require('dotenv').config();
const { fetchInvoice, fetchInvoiceLines, fetchPartnerDetails, fetchCompanyDetails } = require('./odooClient');
const { LedgerService } = require('./ledgerService');
const PostgresLedger = require('./postgresLedger');
const { IdentityEngine } = require('./services/identityEngine');

async function testIdentityIntegrity(invoiceId) {
  console.log('\n🔬 Identity Integrity Test Suite\n');
  console.log('='.repeat(60));

  try {
    // Initialize services
    const ledgerImplementation = new PostgresLedger();
    const ledgerService = new LedgerService(ledgerImplementation);
    const identityEngine = new IdentityEngine(ledgerService);

    await ledgerService.init();
    console.log('✓ Services initialized\n');

    // Test 1: Fetch and register invoice
    console.log('Test 1: Register Invoice');
    console.log('-'.repeat(60));

    const invoice = await fetchInvoice(invoiceId);
    const header = invoice[0];

    if (header.state !== 'posted') {
      console.log('❌ Invoice is not posted. Cannot proceed.');
      return;
    }

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

    const invoiceData = {
      header,
      lines,
      seller_gstin: sellerGstin,
      buyer_gstin: buyerGstin
    };

    const identity1 = await identityEngine.registerInvoice(invoiceData);
    console.log(`✓ GIID: ${identity1.giid}`);
    console.log(`✓ Status: ${identity1.status}`);
    console.log(`✓ Registered: ${identity1.registered}`);
    console.log(`✓ Message: ${identity1.message}\n`);

    const firstGiid = identity1.giid;
    const wasNewlyRegistered = identity1.registered;

    // Test 2: Re-register same invoice (should return existing)
    console.log('Test 2: Re-register Same Invoice (Idempotency)');
    console.log('-'.repeat(60));

    const identity2 = await identityEngine.registerInvoice(invoiceData);
    console.log(`✓ GIID: ${identity2.giid}`);
    console.log(`✓ Status: ${identity2.status}`);
    console.log(`✓ Registered: ${identity2.registered}`);
    console.log(`✓ Message: ${identity2.message}`);

    if (identity2.giid === firstGiid && identity2.registered === false) {
      console.log('✅ PASS: Same GIID returned, not re-registered\n');
    } else {
      console.log('❌ FAIL: GIID should be identical and registered should be false\n');
    }

    // Test 3: Verify GIID lookup
    console.log('Test 3: Verify GIID Lookup');
    console.log('-'.repeat(60));

    const verification = await identityEngine.verifyInvoice(firstGiid);
    console.log(`✓ Found: ${verification.found}`);
    console.log(`✓ GIID: ${verification.giid}`);
    console.log(`✓ Invoice Number: ${verification.invoice_number}`);
    console.log(`✓ Status: ${verification.status}`);

    if (verification.found && verification.giid === firstGiid) {
      console.log('✅ PASS: GIID verification successful\n');
    } else {
      console.log('❌ FAIL: GIID verification failed\n');
    }

    // Test 4: Test deterministic ordering
    console.log('Test 4: Deterministic Ordering');
    console.log('-'.repeat(60));

    const canonical1 = identityEngine.enforceCanonicalOrdering(invoiceData);
    const canonical2 = identityEngine.enforceCanonicalOrdering(invoiceData);
    const giid1 = identityEngine.generateGIID(canonical1);
    const giid2 = identityEngine.generateGIID(canonical2);

    console.log(`✓ GIID 1: ${giid1}`);
    console.log(`✓ GIID 2: ${giid2}`);

    if (giid1 === giid2) {
      console.log('✅ PASS: Deterministic ordering produces identical GIID\n');
    } else {
      console.log('❌ FAIL: GIID should be identical for same data\n');
    }

    // Test 5: Modify data and verify different GIID
    console.log('Test 5: Modified Data Produces Different GIID');
    console.log('-'.repeat(60));

    const modifiedData = {
      ...invoiceData,
      header: {
        ...invoiceData.header,
        amount_total: parseFloat(invoiceData.header.amount_total) + 100
      }
    };

    const canonicalModified = identityEngine.enforceCanonicalOrdering(modifiedData);
    const giidModified = identityEngine.generateGIID(canonicalModified);

    console.log(`✓ Original GIID: ${firstGiid}`);
    console.log(`✓ Modified GIID: ${giidModified}`);

    if (giidModified !== firstGiid) {
      console.log('✅ PASS: Modified data produces different GIID\n');
    } else {
      console.log('❌ FAIL: Modified data should produce different GIID\n');
    }

    // Test 6: Get identity with history
    console.log('Test 6: Get Identity with History');
    console.log('-'.repeat(60));

    const fullIdentity = await identityEngine.getIdentityWithHistory(firstGiid);
    console.log(`✓ GIID: ${fullIdentity.giid}`);
    console.log(`✓ Status: ${fullIdentity.status}`);
    console.log(`✓ Created: ${fullIdentity.created_at}`);
    console.log(`✓ History entries: ${fullIdentity.history.length}`);

    if (fullIdentity.history.length > 0) {
      console.log('\nHistory:');
      fullIdentity.history.forEach((entry, i) => {
        console.log(`  ${i + 1}. ${entry.action} - ${entry.status} at ${entry.timestamp}`);
      });
    }

    console.log('✅ PASS: Identity history retrieved\n');

    // Test 7: Canonical structure validation
    console.log('Test 7: Canonical Structure Validation');
    console.log('-'.repeat(60));

    const canonical = identityEngine.enforceCanonicalOrdering(invoiceData);
    console.log('Canonical structure:');
    console.log(JSON.stringify(canonical, null, 2));

    // Verify field order
    const keys = Object.keys(canonical);
    const expectedOrder = ['seller_gstin', 'buyer_gstin', 'invoice_number', 'invoice_date', 'total_amount', 'line_items'];
    
    let orderCorrect = true;
    expectedOrder.forEach((key, index) => {
      if (keys[index] !== key) {
        orderCorrect = false;
        console.log(`❌ Field order mismatch at position ${index}: expected ${key}, got ${keys[index]}`);
      }
    });

    if (orderCorrect) {
      console.log('✅ PASS: Field order is deterministic\n');
    } else {
      console.log('❌ FAIL: Field order is not deterministic\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Identity Integrity Test Suite Complete\n');

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
  console.log('Usage: node test-identity-integrity.js <invoice_id>');
  console.log('Example: node test-identity-integrity.js 40');
  process.exit(1);
}

testIdentityIntegrity(parseInt(invoiceId))
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
