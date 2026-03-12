/**
 * Test script for GSTIN integration
 * 
 * This script tests the updated invoice endpoint with GSTIN fields
 * 
 * Usage: node test-gstin-integration.js <invoice_id>
 */

const { fetchInvoice, fetchInvoiceLines, fetchPartnerDetails, fetchCompanyDetails } = require('./odooClient');
const { buildCanonicalInvoice } = require('./canonicalize');
const { generateHash } = require('./hashService');

async function testGstinIntegration(invoiceId) {
  try {
    console.log(`\n🔍 Testing GSTIN integration for invoice ID: ${invoiceId}\n`);

    // Step 1: Fetch invoice
    console.log('1️⃣  Fetching invoice from Odoo...');
    const invoice = await fetchInvoice(invoiceId);
    const header = invoice[0];
    console.log(`   ✓ Invoice: ${header.name}`);
    console.log(`   ✓ State: ${header.state}`);

    if (header.state !== 'posted') {
      console.log('   ❌ Invoice is not posted. Cannot proceed.');
      return;
    }

    // Step 2: Fetch invoice lines
    console.log('\n2️⃣  Fetching invoice lines...');
    const lines = await fetchInvoiceLines(header.invoice_line_ids);
    console.log(`   ✓ Found ${lines.length} line items`);

    // Step 3: Extract IDs
    const partnerId = Array.isArray(header.partner_id) ? header.partner_id[0] : header.partner_id;
    const companyId = Array.isArray(header.company_id) ? header.company_id[0] : header.company_id;
    console.log(`\n3️⃣  Extracted IDs:`);
    console.log(`   Partner ID: ${partnerId}`);
    console.log(`   Company ID: ${companyId}`);

    // Step 4: Fetch buyer (partner) details
    console.log('\n4️⃣  Fetching buyer (partner) details...');
    const partnerData = await fetchPartnerDetails(partnerId);
    const partner = partnerData[0];
    console.log(`   Name: ${partner.name}`);
    console.log(`   VAT/GSTIN: ${partner.vat || 'NOT SET'}`);
    console.log(`   Phone: ${partner.phone || 'N/A'}`);
    console.log(`   Email: ${partner.email || 'N/A'}`);

    // Step 5: Fetch seller (company) details
    console.log('\n5️⃣  Fetching seller (company) details...');
    const companyData = await fetchCompanyDetails(companyId);
    const company = companyData[0];
    console.log(`   Name: ${company.name}`);
    console.log(`   VAT/GSTIN: ${company.vat || 'NOT SET'}`);

    // Step 6: Validate GSTIN
    const buyerGstin = partner.vat ? partner.vat.trim() : null;
    const sellerGstin = company.vat ? company.vat.trim() : null;

    console.log('\n6️⃣  GSTIN Validation:');
    if (!buyerGstin) {
      console.log(`   ❌ GSTIN missing for partner: ${partner.name}`);
      return;
    } else {
      console.log(`   ✓ Buyer GSTIN: ${buyerGstin}`);
    }

    if (!sellerGstin) {
      console.log(`   ❌ GSTIN missing for company: ${company.name}`);
      return;
    } else {
      console.log(`   ✓ Seller GSTIN: ${sellerGstin}`);
    }

    // Step 7: Build canonical invoice
    console.log('\n7️⃣  Building canonical invoice...');
    const fullData = {
      header,
      lines,
      seller_gstin: sellerGstin,
      buyer_gstin: buyerGstin
    };

    const canonical = buildCanonicalInvoice(fullData);
    console.log('   ✓ Canonical structure:');
    console.log(JSON.stringify(canonical, null, 2));

    // Step 8: Generate hash
    console.log('\n8️⃣  Generating invoice hash...');
    const hash = generateHash(canonical);
    console.log(`   ✓ Hash: ${hash}`);

    console.log('\n✅ GSTIN integration test completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Get invoice ID from command line
const invoiceId = process.argv[2];

if (!invoiceId) {
  console.log('Usage: node test-gstin-integration.js <invoice_id>');
  console.log('Example: node test-gstin-integration.js 123');
  process.exit(1);
}

testGstinIntegration(parseInt(invoiceId));
