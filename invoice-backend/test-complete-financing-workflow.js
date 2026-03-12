/**
 * Test the complete financing workflow
 * Tests the full pipeline: PENDING → APPROVED → FINANCED
 */

const db = require('./db');
const ActivityModel = require('./models/activity.model');
const { ledgerService } = require('./services');

async function testCompleteFinancingWorkflow() {
  console.log('🧪 Testing Complete Financing Workflow...');
  
  try {
    const testGIID = 'test_workflow_' + Date.now();
    const lenderIdentifier = 'AXIS_BANK';
    const msmeId = 'test-msme-id';
    const invoiceId = 999; // Test invoice ID
    
    console.log(`\n📋 Testing workflow for GIID: ${testGIID}`);
    
    // Step 1: Register test invoice on ledger
    console.log('\n1. Registering test invoice on ledger...');
    const registered = await ledgerService.registerInvoice(
      testGIID,
      'TEST-WORKFLOW-001',
      'test_document_hash',
      'test_ipfs_cid',
      'test_binding_hash'
    );
    
    if (registered) {
      console.log('✅ Invoice registered on ledger');
    } else {
      console.log('ℹ️  Invoice already exists on ledger');
    }
    
    // Step 2: Create financing request (PENDING status)
    console.log('\n2. Creating financing request...');
    await db.query(`
      INSERT INTO financing_requests (invoice_giid, invoice_id, lender_id, msme_id, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      ON CONFLICT (invoice_giid, lender_id) DO UPDATE SET
        status = 'PENDING',
        updated_at = NOW()
    `, [testGIID, invoiceId, lenderIdentifier, msmeId]);
    
    console.log('✅ Financing request created with PENDING status');
    
    // Step 3: Test lock operation (PENDING → APPROVED)
    console.log('\n3. Testing lock operation (Approve & Verify)...');
    const lockResult = await ledgerService.lockInvoice(testGIID, lenderIdentifier);
    
    if (lockResult.success) {
      console.log('✅ Invoice locked on ledger');
      console.log(`   Status: ${lockResult.invoice.status}`);
      console.log(`   Locked by: ${lockResult.invoice.locked_by}`);
      console.log(`   Lender ID: ${lockResult.invoice.lender_id}`);
      
      // Update financing request to APPROVED
      await db.query(`
        UPDATE financing_requests
        SET status = 'APPROVED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [testGIID, lenderIdentifier]);
      
      console.log('✅ Financing request updated to APPROVED');
      
      // Log lock activity
      await ActivityModel.logActivity(lenderIdentifier, testGIID, 'LOCKED', 'Invoice locked for financing');
      console.log('✅ Lock activity logged');
      
    } else {
      console.log('❌ Lock operation failed:', lockResult.error);
      return false;
    }
    
    // Step 4: Test finance operation (APPROVED → FINANCED)
    console.log('\n4. Testing finance operation...');
    const financeResult = await ledgerService.financeInvoice(testGIID, lenderIdentifier);
    
    if (financeResult.success) {
      console.log('✅ Invoice financed on ledger');
      console.log(`   Status: ${financeResult.invoice.status}`);
      console.log(`   Lender ID: ${financeResult.invoice.lender_id}`);
      console.log(`   Financed at: ${financeResult.invoice.financed_at}`);
      
      // Update financing request to FINANCED
      await db.query(`
        UPDATE financing_requests
        SET status = 'FINANCED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [testGIID, lenderIdentifier]);
      
      console.log('✅ Financing request updated to FINANCED');
      
      // Log finance activity
      await ActivityModel.logActivity(lenderIdentifier, testGIID, 'FINANCED', 'Invoice financed successfully');
      console.log('✅ Finance activity logged');
      
    } else {
      console.log('❌ Finance operation failed:', financeResult.error);
      return false;
    }
    
    // Step 5: Test decline workflow (alternative path)
    console.log('\n5. Testing decline workflow with new invoice...');
    const testGIID2 = 'test_decline_' + Date.now();
    
    // Register second test invoice
    await ledgerService.registerInvoice(
      testGIID2,
      'TEST-DECLINE-001',
      'test_document_hash_2',
      'test_ipfs_cid_2',
      'test_binding_hash_2'
    );
    
    // Create financing request
    await db.query(`
      INSERT INTO financing_requests (invoice_giid, invoice_id, lender_id, msme_id, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
    `, [testGIID2, invoiceId + 1, lenderIdentifier, msmeId]);
    
    // Lock invoice
    const lockResult2 = await ledgerService.lockInvoice(testGIID2, lenderIdentifier);
    if (lockResult2.success) {
      await db.query(`
        UPDATE financing_requests
        SET status = 'APPROVED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [testGIID2, lenderIdentifier]);
      
      console.log('✅ Second invoice locked and approved');
      
      // Now test decline (unlock)
      const unlockResult = await ledgerService.unlockInvoice(testGIID2, lenderIdentifier);
      if (unlockResult.success) {
        console.log('✅ Invoice unlocked (declined)');
        console.log(`   Status: ${unlockResult.invoice.status}`);
        console.log(`   Locked by: ${unlockResult.invoice.locked_by || 'NULL'}`);
        console.log(`   Lender ID: ${unlockResult.invoice.lender_id || 'NULL'}`);
        
        // Update financing request to REJECTED
        await db.query(`
          UPDATE financing_requests
          SET status = 'REJECTED', updated_at = NOW()
          WHERE invoice_giid = $1 AND lender_id = $2
        `, [testGIID2, lenderIdentifier]);
        
        console.log('✅ Financing request updated to REJECTED');
        
        // Log decline activity
        await ActivityModel.logActivity(lenderIdentifier, testGIID2, 'REJECTED', 'Invoice rejected by lender');
        console.log('✅ Decline activity logged');
        
      } else {
        console.log('❌ Unlock operation failed:', unlockResult.error);
      }
    }
    
    // Step 6: Verify final states
    console.log('\n6. Verifying final states...');
    
    const finalStates = await db.query(`
      SELECT invoice_giid, status, updated_at
      FROM financing_requests
      WHERE invoice_giid IN ($1, $2) AND lender_id = $3
      ORDER BY invoice_giid
    `, [testGIID, testGIID2, lenderIdentifier]);
    
    console.log('📊 Final financing request states:');
    finalStates.rows.forEach(row => {
      console.log(`   ${row.invoice_giid}: ${row.status}`);
    });
    
    // Check activities
    const activities = await ActivityModel.getLenderActivities(lenderIdentifier, 10);
    console.log(`📈 Found ${activities.length} activities for ${lenderIdentifier}`);
    
    console.log('\n🎉 Complete financing workflow test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    return false;
  }
}

// Run the test
testCompleteFinancingWorkflow().then(success => {
  if (success) {
    console.log('\n✅ All workflow tests passed!');
  } else {
    console.log('\n💥 Some workflow tests failed!');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});