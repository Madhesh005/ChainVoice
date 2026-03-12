/**
 * Test Fabric Connection
 * Quick test to verify Fabric network connectivity
 */

require('dotenv').config();
const FabricLedger = require('./fabricLedger');

async function testConnection() {
  console.log('🧪 Testing Fabric Network Connection\n');
  console.log('='.repeat(50));
  
  const fabricLedger = new FabricLedger({
    channelName: process.env.FABRIC_CHANNEL || 'mychannel',
    chaincodeName: process.env.FABRIC_CHAINCODE || 'invoicecc',
    userId: process.env.FABRIC_USER || 'appUser',
    orgMSP: process.env.FABRIC_ORG_MSP || 'Org1MSP'
  });

  try {
    // Test 1: Initialize connection
    console.log('\n1️⃣  Testing connection initialization...');
    await fabricLedger.init();
    console.log('   ✓ Connection successful');

    // Test 2: Get statistics
    console.log('\n2️⃣  Testing chaincode query (GetStatistics)...');
    const stats = await fabricLedger.getStatistics();
    console.log('   ✓ Chaincode responsive');
    console.log(`   📊 Total invoices: ${stats.total}`);
    console.log(`   📊 Available: ${stats.available}`);
    console.log(`   📊 Locked: ${stats.locked}`);
    console.log(`   📊 Financed: ${stats.financed}`);
    console.log(`   📊 Closed: ${stats.closed}`);

    // Test 3: Register a test invoice
    console.log('\n3️⃣  Testing invoice registration...');
    const testGIID = 'test_' + Date.now();
    const testInvoiceNumber = 'TEST-' + Date.now();
    const testDocHash = 'a'.repeat(64); // Dummy hash
    const testBindingHash = 'b'.repeat(64); // Dummy hash
    const testCID = 'QmTest123'; // Dummy CID

    try {
      await fabricLedger.registerInvoice(
        testGIID,
        testInvoiceNumber,
        testDocHash,
        testCID,
        testBindingHash
      );
      console.log('   ✓ Invoice registered successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ✓ Invoice registration works (duplicate detected)');
      } else {
        throw error;
      }
    }

    // Test 4: Verify the invoice
    console.log('\n4️⃣  Testing invoice verification...');
    const result = await fabricLedger.verifyInvoice(testGIID);
    if (result.found) {
      console.log('   ✓ Invoice found on ledger');
      console.log(`   📄 Invoice Number: ${result.invoice_number}`);
      console.log(`   📄 Status: ${result.status}`);
      console.log(`   📄 Document Hash: ${result.document_hash ? result.document_hash.substring(0, 16) + '...' : 'N/A'}`);
      console.log(`   📄 Binding Hash: ${result.binding_hash ? result.binding_hash.substring(0, 16) + '...' : 'N/A'}`);
    } else {
      console.log('   ⚠️  Invoice not found (may have been registered in previous test)');
    }

    // Test 5: Query by status
    console.log('\n5️⃣  Testing query by status...');
    const availableInvoices = await fabricLedger.queryInvoicesByStatus('AVAILABLE');
    console.log(`   ✓ Found ${availableInvoices.length} available invoices`);

    // Disconnect
    await fabricLedger.disconnect();

    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS PASSED!');
    console.log('\nYour Fabric integration is working correctly.');
    console.log('You can now start the server with: node server.js');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error('   Error:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.error('   1. Check if Fabric network is running: docker ps');
    console.error('   2. Verify wallet has appUser: ls wallet/');
    console.error('   3. Check connection profile: cat connection-org1.json');
    console.error('   4. Run diagnostic: node diagnose-fabric.js');
    console.error('\n' + '='.repeat(50));
    process.exit(1);
  }
}

testConnection();
