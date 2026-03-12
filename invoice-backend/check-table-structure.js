const db = require('./db');

async function checkTables() {
  try {
    console.log('📋 Checking table structures...\n');

    // Check invoices table columns
    console.log('1. Invoices table columns:');
    const invoiceColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' 
      ORDER BY ordinal_position
    `);
    
    invoiceColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Check lender_invoice_access table columns
    console.log('\n2. Lender_invoice_access table columns:');
    const accessColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'lender_invoice_access' 
      ORDER BY ordinal_position
    `);
    
    accessColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    // Check financing_requests table columns
    console.log('\n3. Financing_requests table columns:');
    const requestColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'financing_requests' 
      ORDER BY ordinal_position
    `);
    
    requestColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();