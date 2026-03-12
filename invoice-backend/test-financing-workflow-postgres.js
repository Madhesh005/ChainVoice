/**
 * Test the financing workflow with PostgreSQL ledger
 */

const db = require('./db');
const ActivityModel = require('./models/activity.model');
const PostgresLedger = require('./postgresLedger');
const { LedgerService } = require('./ledgerService');

async function testFinancingWorkflowPostgres() {
  console.log('🧪 Testing Financing Workflow with PostgreSQL...');
  
  try {
    // Initialize PostgreSQL ledger
    const postgresLedger = new PostgresLedger();
    const ledgerService = new LedgerService(postgresLedger);
    await ledgerService.init();
    
    const testGIID = 'test_postgres_' + Date.now();
    const lenderIdentifier = 'AXIS_BANK';
    const msmeId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
    const invoiceId = 999;
    
    console.log(`\n📋 Testing workflow for GIID: ${testGIID}`);
    
    // Step 1: Register test invoice
    console.log('\n1. Registering test invoice...');
    const registered = await ledgerService.registerInvoice(
      testGIID,
      'TEST-POSTGRES-001',
      'test_document_hash',
      'test_ipfs_cid',
      'test_binding_hash'
    );
    
    console.log(`✅ Invoice registration: ${registered ? 'SUCCESS' : 'ALREADY EXISTS'}`);
    
    // Step 2: Create financing request (PENDING)
    console.log('\n2. Creating financing request (PENDING)...');
    await db.query(`
      INSERT INTO financing_requests (invoice_giid, invoice_id, lender_id, msme_id, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
      ON CONFLICT (invoice_giid, lender_id) DO UPDATE SET
        status = 'PENDING',
        updated_at = NOW()
    `, [testGIID, invoiceId, lenderIdentifier, msmeId]);
    
    console.log('✅ Financing request created: PENDING');
    
    // Step 3: Lock invoice (PENDING → APPROVED)
    console.log('\n3. Locking invoice (PENDING → APPROVED)...');
    const lockResult = await ledgerService.lockInvoice(testGIID, lenderIdentifier);
    
    if (lockResult.success) {
      console.log('✅ Invoice locked successfully');
      console.log(`   Status: ${lockResult.invoice.status}`);
      console.log(`   Locked by: ${lockResult.invoice.locked_by}`);
      console.log(`   Lender ID: ${lockResult.invoice.lender_id}`);
      
      // Update financing request to APPROVED
      await db.query(`
        UPDATE financing_requests
        SET status = 'APPROVED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [testGIID, lenderIdentifier]);
      
      console.log('✅ Financing request updated: APPROVED');
      
      // Log activity
      await ActivityModel.logActivity(lenderIdentifier, testGIID, 'LOCKED', 'Invoice locked for financing');
      console.log('✅ Lock activity logged');
      
    } else {
      console.log('❌ Lock failed:', lockResult.error);
      return false;
    }
    
    // Step 4: Finance invoice (APPROVED → FINANCED)
    console.log('\n4. Financing invoice (APPROVED → FINANCED)...');
    const financeResult = await ledgerService.financeInvoice(testGIID, lenderIdentifier);
    
    if (financeResult.success) {
      console.log('✅ Invoice financed successfully');
      console.log(`   Status: ${financeResult.invoice.status}`);
      console.log(`   Lender ID: ${financeResult.invoice.lender_id}`);
      console.log(`   Financed at: ${financeResult.invoice.financed_at}`);
      
      // Update financing request to FINANCED
      await db.query(`
        UPDATE financing_requests
        SET status = 'FINANCED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [testGIID, lenderIdentifier]);
      
      console.log('✅ Financing request updated: FINANCED');
      
      // Log activity
      await ActivityModel.logActivity(lenderIdentifier, testGIID, 'FINANCED', 'Invoice financed successfully');
      console.log('✅ Finance activity logged');
      
    } else {
      console.log('❌ Finance failed:', financeResult.error);
      return false;
    }
    
    // Step 5: Test decline workflow
    console.log('\n5. Testing decline workflow...');
    const testGIID2 = 'test_decline_' + Date.now();
    
    // Register and lock second invoice
    await ledgerService.registerInvoice(testGIID2, 'TEST-DECLINE-001');
    await db.query(`
      INSERT INTO financing_requests (invoice_giid, invoice_id, lender_id, msme_id, status)
      VALUES ($1, $2, $3, $4, 'PENDING')
    `, [testGIID2, invoiceId + 1, lenderIdentifier, msmeId]);
    
    const lockResult2 = await ledgerService.lockInvoice(testGIID2, lenderIdentifier);
    if (lockResult2.success) {
      await db.query(`
        UPDATE financing_requests
        SET status = 'APPROVED', updated_at = NOW()
        WHERE invoice_giid = $1 AND lender_id = $2
      `, [testGIID2, lenderIdentifier]);
      
      console.log('✅ Second invoice locked and approved');
      
      // Test decline (unlock)
      const unlockResult = await ledgerService.unlockInvoice(testGIID2, lenderIdentifier);
      if (unlockResult.success) {
        console.log('✅ Invoice unlocked (declined)');
        console.log(`   Status: ${unlockResult.invoice.status}`);
        console.log(`   Locked by: ${unlockResult.invoice.locked_by || 'NULL'}`);
        console.log(`   Lender ID: ${unlockResult.invoice.lender_id || 'NULL'}`);
        
        // Update to REJECTED
        await db.query(`
          UPDATE financing_requests
          SET status = 'REJECTED', updated_at = NOW()
          WHERE invoice_giid = $1 AND lender_id = $2
        `, [testGIID2, lenderIdentifier]);
        
        console.log('✅ Financing request updated: REJECTED');
        
        // Log activity
        await ActivityModel.logActivity(lenderIdentifier, testGIID2, 'REJECTED', 'Invoice rejected by lender');
        console.log('✅ Decline activity logged');
      }
    }
    
    // Step 6: Verify final states
    console.log('\n6. Verifying final states...');
    
    const finalStates = await db.query(`
      SELECT invoice_giid, status, updated_at
      FROM financing_requests
      WHERE invoice_giid IN ($1, $2) AND lender_id = $3
      ORDER BY updated_at DESC
    `, [testGIID, testGIID2, lenderIdentifier]);
    
    console.log('📊 Final states:');
    finalStates.rows.forEach(row => {
      console.log(`   ${row.invoice_giid.substring(0, 20)}...: ${row.status}`);
    });
    
    // Check activities
    const activities = await ActivityModel.getLenderActivities(lenderIdentifier, 5);
    console.log(`📈 Recent activities: ${activities.length}`);
    activities.forEach(activity => {
      console.log(`   ${activity.action}: ${activity.description}`);
    });
    
    console.log('\n🎉 PostgreSQL workflow test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    return false;
  }
}

// Run the test
testFinancingWorkflowPostgres().then(success => {
  if (success) {
    console.log('\n✅ PostgreSQL workflow test passed!');
  } else {
    console.log('\n💥 PostgreSQL workflow test failed!');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});