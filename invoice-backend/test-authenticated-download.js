/**
 * Authenticated Download Test
 * 
 * Tests that IPFS download works with JWT authentication via Pinata gateway.
 * 
 * Usage: node test-authenticated-download.js <cid>
 */

require('dotenv').config();
const { IPFSService } = require('./services/ipfsService');

async function testAuthenticatedDownload(cid) {
  console.log('\n🔐 Authenticated Download Test\n');
  console.log('='.repeat(60));

  try {
    const ipfsService = new IPFSService();

    // Check configuration
    console.log('\n1️⃣  Checking configuration...');
    if (!ipfsService.isConfigured()) {
      console.log('❌ PINATA_JWT not configured');
      console.log('   Set PINATA_JWT in .env file');
      return;
    }
    console.log('✓ PINATA_JWT configured');

    // Test connection
    console.log('\n2️⃣  Testing Pinata connection...');
    const connected = await ipfsService.testConnection();
    if (!connected) {
      console.log('❌ Pinata connection failed');
      return;
    }
    console.log('✓ Pinata connection successful');

    // Download file
    console.log('\n3️⃣  Downloading file with authentication...');
    console.log(`   CID: ${cid}`);
    
    const startTime = Date.now();
    const buffer = await ipfsService.downloadFile(cid);
    const downloadTime = Date.now() - startTime;

    console.log(`\n✓ Download successful!`);
    console.log(`   Time: ${downloadTime}ms`);
    console.log(`   Size: ${buffer.length} bytes`);
    console.log(`   Type: ${buffer.constructor.name}`);

    // Validate buffer
    console.log('\n4️⃣  Validating buffer...');
    console.log(`   Is Buffer: ${Buffer.isBuffer(buffer)}`);
    console.log(`   Length: ${buffer.length}`);

    // Check PDF signature
    console.log('\n5️⃣  Checking PDF signature...');
    const signature = buffer.slice(0, 5).toString('ascii');
    console.log(`   Signature: ${signature}`);
    console.log(`   Valid PDF: ${signature === '%PDF-'}`);

    if (signature !== '%PDF-') {
      console.log('\n❌ Not a valid PDF!');
      console.log(`   First 20 bytes (hex): ${buffer.slice(0, 20).toString('hex')}`);
      console.log(`   First 20 bytes (ascii): ${buffer.slice(0, 20).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
      
      // Check if HTML
      const contentStart = buffer.slice(0, 100).toString('ascii');
      if (contentStart.includes('<html') || contentStart.includes('<!DOCTYPE')) {
        console.log('   ⚠️  Received HTML instead of PDF!');
        console.log('   This indicates authentication may have failed');
      }
      return;
    }

    // Compute hash
    console.log('\n6️⃣  Computing SHA-256 hash...');
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`   Hash: ${hash}`);

    // Get gateway URL
    console.log('\n7️⃣  Gateway information...');
    const gatewayUrl = ipfsService.getGatewayUrl(cid);
    console.log(`   URL: ${gatewayUrl}`);
    console.log(`   Note: This URL requires JWT authentication to access`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Authenticated Download Test PASSED!');
    console.log('='.repeat(60));
    console.log('\nSummary:');
    console.log(`  CID: ${cid}`);
    console.log(`  Size: ${buffer.length} bytes`);
    console.log(`  Download Time: ${downloadTime}ms`);
    console.log(`  PDF Valid: Yes`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Gateway: https://gateway.pinata.cloud/ipfs/`);
    console.log(`  Authentication: JWT (Bearer token)`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nError details:');
    console.error('  Message:', error.message);
    
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Status Text:', error.response.statusText);
      console.error('  Content-Type:', error.response.headers['content-type']);
      
      if (error.response.status === 401) {
        console.error('\n⚠️  Authentication failed (401 Unauthorized)');
        console.error('   Check that PINATA_JWT is valid and not expired');
      }
      
      if (error.response.status === 404) {
        console.error('\n⚠️  File not found (404 Not Found)');
        console.error('   Check that CID is correct and file exists on IPFS');
      }
    }
    
    console.error('\nStack:', error.stack);
  }
}

// Get CID from command line
const cid = process.argv[2];

if (!cid) {
  console.log('Usage: node test-authenticated-download.js <cid>');
  console.log('Example: node test-authenticated-download.js QmXyz123abc...');
  console.log('\nTo get a CID:');
  console.log('  1. Register an invoice: curl http://localhost:3000/invoice/40');
  console.log('  2. Copy the ipfs_cid from the response');
  console.log('  3. Run this test with that CID');
  process.exit(1);
}

testAuthenticatedDownload(cid)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
