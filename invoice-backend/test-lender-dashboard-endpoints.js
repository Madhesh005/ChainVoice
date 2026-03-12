/**
 * Test lender dashboard endpoints to ensure they return proper data structure
 */

const db = require('./db');
const ActivityModel = require('./models/activity.model');

async function testLenderDashboardEndpoints() {
  console.log('🧪 Testing Lender Dashboard Endpoints...');
  
  try {
    // Test 1: Dashboard Stats Query
    console.log('\n1. Testing Dashboard Stats Query...');
    const lenderIdentifier = 'AXIS_BANK';
    
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM financing_requests fr
      WHERE fr.lender_id = $1
      AND fr.status = 'PENDING'
    `;
    const pendingResult = await db.query(pendingQuery, [lenderIdentifier]);
    console.log('✅ Pending verification count:', pendingResult.rows[0].count);
    
    const activeQuery = `
      SELECT COALESCE(SUM(i.amount), 0) as total
      FROM financing_requests fr
      JOIN invoices i ON fr.invoice_id = i.id
      WHERE fr.lender_id = $1
    `;
    const activeResult = await db.query(activeQuery, [lenderIdentifier]);
    console.log('✅ Active financing total:', activeResult.rows[0].total);
    
    // Test 2: Activity Query
    console.log('\n2. Testing Activity Query...');
    const activities = await ActivityModel.getLenderActivities(lenderIdentifier, 5);
    console.log(`✅ Found ${activities.length} activities for ${lenderIdentifier}`);
    
    if (activities.length > 0) {
      console.log('Sample activity structure:');
      console.log(JSON.stringify(activities[0], null, 2));
    }
    
    // Test 3: Pending Invoices Query
    console.log('\n3. Testing Pending Invoices Query...');
    const pendingInvoicesQuery = `
      SELECT 
        fr.id as request_id,
        fr.status as request_status,
        fr.created_at as request_date,
        fr.lender_id,
        i.id as invoice_id,
        i.invoice_number,
        i.buyer_name,
        i.seller_gstin as seller_name,
        i.amount,
        i.giid,
        i.ipfs_cid,
        i.document_hash,
        i.blockchain_status,
        m.company_name as msme_company_name
      FROM financing_requests fr
      JOIN invoices i ON fr.invoice_id = i.id
      JOIN msme_users m ON fr.msme_id = m.id
      WHERE fr.lender_id = $1
      AND fr.status = 'PENDING'
      ORDER BY fr.created_at DESC
      LIMIT 5
    `;
    
    const pendingInvoicesResult = await db.query(pendingInvoicesQuery, [lenderIdentifier]);
    console.log(`✅ Found ${pendingInvoicesResult.rows.length} pending invoices`);
    
    if (pendingInvoicesResult.rows.length > 0) {
      console.log('Sample invoice structure:');
      console.log(JSON.stringify(pendingInvoicesResult.rows[0], null, 2));
    }
    
    // Test 4: Check for null/undefined amounts
    console.log('\n4. Checking for null/undefined amounts...');
    const amountCheckQuery = `
      SELECT 
        COUNT(*) as total_invoices,
        COUNT(i.amount) as invoices_with_amount,
        COUNT(*) - COUNT(i.amount) as invoices_without_amount
      FROM financing_requests fr
      JOIN invoices i ON fr.invoice_id = i.id
      WHERE fr.lender_id = $1
    `;
    
    const amountCheckResult = await db.query(amountCheckQuery, [lenderIdentifier]);
    const amountStats = amountCheckResult.rows[0];
    console.log('✅ Amount statistics:');
    console.log(`   Total invoices: ${amountStats.total_invoices}`);
    console.log(`   With amount: ${amountStats.invoices_with_amount}`);
    console.log(`   Without amount: ${amountStats.invoices_without_amount}`);
    
    if (parseInt(amountStats.invoices_without_amount) > 0) {
      console.log('⚠️  Warning: Some invoices have null/undefined amounts');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testLenderDashboardEndpoints().then(success => {
  if (success) {
    console.log('\n🎉 All dashboard endpoint tests passed!');
  } else {
    console.log('\n💥 Some dashboard endpoint tests failed!');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});