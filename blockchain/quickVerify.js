/**
 * Quick Blockchain Verification
 * Tests all critical functions of the invoice chaincode
 */

const FabricService = require('./fabricService');
const crypto = require('crypto');

async function verify() {
  const fabric = new FabricService();
  
  try {
    console.log('\n🔍 Quick Blockchain Verification');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Test 1: Connect
    console.log('Test 1/6: Connecting to blockchain...');
    await fabric.connect();
    console.log('✅ Connected\n');
    
    // Test 2: Register Invoice
    console.log('Test 2/6: Registering test invoice...');
    const testHash = 'TEST-' + crypto.randomBytes(8).toString('hex');
    const result = await fabric.registerInvoice(
      testHash,
      'INV-001',
      crypto.randomBytes(32).toString('hex'),
      crypto.randomBytes(32).toString('hex'),
      'QmTest123'
    );
    
    if (result.success) {
      console.log('✅ Invoice registered:', testHash, '\n');
    } else {
      throw new Error('Failed to register invoice: ' + result.message);
    }
    
    // Test 3: Verify Invoice
    console.log('Test 3/6: Verifying invoice...');
    const verify = await fabric.verifyInvoice(testHash);
    if (verify.success && verify.invoice) {
      console.log('✅ Invoice found on blockchain');
      console.log(`   Status: ${verify.invoice.status}`);
      console.log(`   Number: ${verify.invoice.number}\n`);
    } else {
      throw new Error('Failed to verify invoice');
    }
    
    // Test 4: Lock Invoice
    console.log('Test 4/6: Locking invoice...');
    const lock = await fabric.lockInvoice(testHash, 'LENDER-001');
    if (lock.success) {
      console.log('✅ Invoice locked');
      console.log(`   Status: ${lock.invoice.status}`);
      console.log(`   Locked by: ${lock.invoice.lockedBy}\n`);
    } else {
      throw new Error('Failed to lock invoice');
    }
    
    // Test 5: Get Statistics
    console.log('Test 5/6: Getting statistics...');
    const stats = await fabric.getStatistics();
    if (stats.success) {
      console.log('✅ Statistics retrieved');
      console.log(`   Total Invoices: ${stats.statistics.total}`);
      console.log(`   Available: ${stats.statistics.available}`);
      console.log(`   Locked: ${stats.statistics.locked}\n`);
    } else {
      throw new Error('Failed to get statistics');
    }
    
    // Test 6: Invoice History
    console.log('Test 6/6: Getting invoice history...');
    const history = await fabric.getInvoiceHistory(testHash);
    if (history.success) {
      console.log('✅ History retrieved');
      console.log(`   History entries: ${history.count}\n`);
    } else {
      throw new Error('Failed to get history');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('📋 Verification Summary:');
    console.log('   • Connection: ✅');
    console.log('   • Register Invoice: ✅');
    console.log('   • Verify Invoice: ✅');
    console.log('   • Lock Invoice: ✅');
    console.log('   • Get Statistics: ✅');
    console.log('   • Invoice History: ✅');
    console.log('\n✅ Blockchain layer is FULLY OPERATIONAL!\n');
    
    fabric.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Verification FAILED!');
    console.error(`   Error: ${error.message}\n`);
    fabric.disconnect();
    process.exit(1);
  }
}

verify();
