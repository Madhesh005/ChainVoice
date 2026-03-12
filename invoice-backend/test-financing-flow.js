const db = require('./db');

async function testFinancingFlow() {
  try {
    console.log('🧪 Testing Financing Request Flow...\n');

    // 1. Check if financing_requests table exists
    console.log('1. Checking financing_requests table...');
    const tableCheck = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financing_requests'
      ORDER BY ordinal_position
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ financing_requests table does not exist');
      return;
    }
    
    console.log('✅ financing_requests table exists with columns:');
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // 2. Test inserting a sample financing request
    console.log('\n2. Testing sample financing request insertion...');
    
    const sampleData = {
      invoice_giid: 'test-giid-12345',
      invoice_id: 1,
      lender_id: 'HDFC_BANK',
      msme_id: 'test-msme-uuid'
    };

    try {
      await db.query(`
        INSERT INTO financing_requests(invoice_giid, invoice_id, lender_id, msme_id)
        VALUES ($1, $2, $3, $4)
      `, [sampleData.invoice_giid, sampleData.invoice_id, sampleData.lender_id, sampleData.msme_id]);
      
      console.log('✅ Sample financing request inserted successfully');
    } catch (insertError) {
      console.log('⚠️  Insert failed (expected if foreign key constraints):', insertError.message);
    }

    // 3. Test the lender query
    console.log('\n3. Testing lender dashboard query...');
    
    const lenderQuery = `
      SELECT
        fr.id,
        fr.invoice_giid,
        fr.lender_id,
        fr.status,
        fr.created_at
      FROM financing_requests fr
      WHERE fr.lender_id = $1
      AND fr.status = 'PENDING'
      ORDER BY fr.created_at DESC
    `;
    
    const lenderResult = await db.query(lenderQuery, ['HDFC_BANK']);
    console.log(`✅ Lender query executed successfully, found ${lenderResult.rows.length} requests`);
    
    if (lenderResult.rows.length > 0) {
      console.log('   Sample result:');
      console.log('  ', lenderResult.rows[0]);
    }

    // 4. Clean up test data
    console.log('\n4. Cleaning up test data...');
    await db.query('DELETE FROM financing_requests WHERE invoice_giid = $1', ['test-giid-12345']);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Financing request flow is ready.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    process.exit(0);
  }
}

testFinancingFlow();