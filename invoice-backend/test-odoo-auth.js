/**
 * Test Odoo Authentication and PDF Download
 * 
 * This script tests:
 * 1. Odoo session authentication
 * 2. PDF download with session cookie
 * 3. PDF signature validation
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

async function testOdooAuth() {
  console.log('\n🧪 Testing Odoo Authentication\n');
  console.log('Configuration:');
  console.log(`  URL: ${ODOO_URL}`);
  console.log(`  Database: ${ODOO_DB}`);
  console.log(`  Username: ${ODOO_USERNAME}`);
  console.log('');

  try {
    // Step 1: Authenticate
    console.log('1️⃣  Authenticating with Odoo...');
    
    const authResponse = await axios.post(
      `${ODOO_URL}/web/session/authenticate`,
      {
        jsonrpc: '2.0',
        params: {
          db: ODOO_DB,
          login: ODOO_USERNAME,
          password: ODOO_PASSWORD
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!authResponse.data || !authResponse.data.result || !authResponse.data.result.uid) {
      console.error('❌ Authentication failed - no user ID returned');
      console.error('Response:', JSON.stringify(authResponse.data, null, 2));
      process.exit(1);
    }

    console.log('   ✓ Authentication successful');
    console.log(`   ✓ User ID: ${authResponse.data.result.uid}`);
    console.log(`   ✓ Username: ${authResponse.data.result.username}`);

    // Extract session cookie
    const cookies = authResponse.headers['set-cookie'];
    if (!cookies || cookies.length === 0) {
      console.error('❌ No session cookie received');
      process.exit(1);
    }

    const sessionCookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    console.log('   ✓ Session cookie obtained');
    console.log(`   ✓ Cookie: ${sessionCookie.substring(0, 50)}...`);

    // Step 2: Test PDF download
    console.log('\n2️⃣  Testing PDF download...');
    console.log('   Enter invoice ID to test (or press Enter to skip): ');
    
    // For automated testing, use invoice ID from command line arg
    const invoiceId = process.argv[2];
    
    if (!invoiceId) {
      console.log('   ⚠️  No invoice ID provided, skipping PDF download test');
      console.log('   ℹ️  Usage: node test-odoo-auth.js <invoice_id>');
      console.log('\n✅ Authentication test passed!\n');
      process.exit(0);
    }

    console.log(`   Testing with invoice ID: ${invoiceId}`);

    const pdfUrl = `${ODOO_URL}/report/pdf/account.report_invoice/${invoiceId}`;
    console.log(`   URL: ${pdfUrl}`);

    const pdfResponse = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Cookie': sessionCookie,
        'Accept': 'application/pdf'
      },
      timeout: 30000,
      maxRedirects: 0
    });

    const buffer = Buffer.from(pdfResponse.data);
    console.log(`   ✓ Response received: ${buffer.length} bytes`);

    // Validate PDF signature
    const signature = buffer.slice(0, 5).toString('ascii');
    console.log(`   ✓ File signature: ${signature}`);

    if (signature !== '%PDF-') {
      console.error('   ❌ Invalid PDF signature!');
      console.error('   ❌ Received HTML/text instead of PDF');
      console.error('   First 200 bytes:');
      console.error(buffer.slice(0, 200).toString('utf8'));
      process.exit(1);
    }

    console.log('   ✓ PDF signature valid');

    // Save PDF to file
    const filename = `test_invoice_${invoiceId}.pdf`;
    fs.writeFileSync(filename, buffer);
    console.log(`   ✓ PDF saved to: ${filename}`);

    console.log('\n✅ All tests passed!\n');
    console.log('Summary:');
    console.log('  ✓ Odoo authentication working');
    console.log('  ✓ Session cookie obtained');
    console.log('  ✓ PDF download working');
    console.log('  ✓ PDF signature valid');
    console.log(`  ✓ Test file saved: ${filename}\n`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
      
      if (error.response.data) {
        if (Buffer.isBuffer(error.response.data)) {
          const preview = error.response.data.slice(0, 200).toString('utf8');
          console.error('Response preview:', preview);
        } else {
          console.error('Response data:', error.response.data);
        }
      }
    }
    
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run test
testOdooAuth();
