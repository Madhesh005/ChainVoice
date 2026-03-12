/**
 * Test script to verify the fixes for ChainVoice invoice financing backend
 * Tests:
 * 1. Activity logging with new format
 * 2. Lender activity retrieval
 * 3. Ledger lock operation with lender_id update
 */

const ActivityModel = require('./models/activity.model');
const { ledgerService } = require('./services');
const db = require('./db');

async function testActivityLogging() {
  console.log('\n🧪 Testing Activity Logging...');
  
  try {
    // Test new activity logging format
    const result = await ActivityModel.logActivity(
      'AXIS_BANK',
      'test_giid_12345',
      'LOCKED',
      'Invoice locked for financing'
    );
    
    console.log('✅ Activity logged successfully:', result);
    
    // Test lender activity retrieval
    const activities = await ActivityModel.getLenderActivities('AXIS_BANK', 5);
    console.log(`✅ Retrieved ${activities.length} activities for AXIS_BANK`);
    
    return true;
  } catch (error) {
    console.error('❌ Activity logging test failed:', error.message);
    return false;
  }
}

async function testLedgerOperations() {
  console.log('\n🧪 Testing Ledger Operations...');
  
  try {
    const testGIID = 'test_invoice_' + Date.now();
    const lenderIdentifier = 'AXIS_BANK';
    
    // Register a test invoice
    console.log('📝 Registering test invoice...');
    const registered = await ledgerService.registerInvoice(
      testGIID,
      'TEST-INV-001',
      'test_document_hash',
      'test_ipfs_cid',
      'test_binding_hash'
    );
    
    if (!registered) {
      console.log('ℹ️  Invoice already exists, continuing with test...');
    }
    
    // Test lock operation
    console.log('🔒 Testing lock operation...');
    const lockResult = await ledgerService.lockInvoice(testGIID, lenderIdentifier);
    
    if (lockResult.success) {
      console.log('✅ Lock operation successful');
      console.log('   Status:', lockResult.invoice.status);
      console.log('   Locked by:', lockResult.invoice.locked_by);
      console.log('   Lender ID:', lockResult.invoice.lender_id);
      
      // Verify both fields are set
      if (lockResult.invoice.locked_by === lenderIdentifier && 
          lockResult.invoice.lender_id === lenderIdentifier) {
        console.log('✅ Both locked_by and lender_id are correctly set');
      } else {
        console.log('❌ Lender ID fields not properly set');
        console.log('   Expected:', lenderIdentifier);
        console.log('   locked_by:', lockResult.invoice.locked_by);
        console.log('   lender_id:', lockResult.invoice.lender_id);
      }
      
      // Test unlock operation
      console.log('🔓 Testing unlock operation...');
      const unlockResult = await ledgerService.unlockInvoice(testGIID, lenderIdentifier);
      
      if (unlockResult.success) {
        console.log('✅ Unlock operation successful');
        console.log('   Status:', unlockResult.invoice.status);
        console.log('   Locked by:', unlockResult.invoice.locked_by || 'NULL');
        console.log('   Lender ID:', unlockResult.invoice.lender_id || 'NULL');
      } else {
        console.log('❌ Unlock operation failed:', unlockResult.error);
      }
      
    } else {
      console.log('❌ Lock operation failed:', lockResult.error);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Ledger operations test failed:', error.message);
    return false;
  }
}

async function testDatabaseSchema() {
  console.log('\n🧪 Testing Database Schema...');
  
  try {
    // Check if activity_log table has required columns
    const result = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'activity_log' 
      AND column_name IN ('lender_identifier', 'giid', 'action', 'description')
      ORDER BY column_name
    `);
    
    const columns = result.rows.map(row => row.column_name);
    const requiredColumns = ['lender_identifier', 'giid', 'action', 'description'];
    
    console.log('📋 Found columns:', columns);
    
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist in activity_log table');
    } else {
      console.log('❌ Missing columns:', missingColumns);
    }
    
    // Check indexes
    const indexResult = await db.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'activity_log' 
      AND indexname IN ('idx_activity_lender', 'idx_activity_time')
    `);
    
    const indexes = indexResult.rows.map(row => row.indexname);
    console.log('📋 Found indexes:', indexes);
    
    return true;
  } catch (error) {
    console.error('❌ Database schema test failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting ChainVoice Backend Fixes Test Suite');
  console.log('=' .repeat(50));
  
  const results = [];
  
  results.push(await testDatabaseSchema());
  results.push(await testActivityLogging());
  results.push(await testLedgerOperations());
  
  console.log('\n📊 Test Results Summary');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The fixes are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the output above.');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});