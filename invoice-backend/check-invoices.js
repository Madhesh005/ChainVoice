/**
 * Check Available Invoices
 * 
 * This script checks what invoices are available in the database
 */

require('dotenv').config();
const db = require('./db');

async function checkInvoices() {
  console.log('🔍 Checking available invoices in database...\n');

  try {
    // Get all invoices
    const result = await db.query(`
      SELECT 
        i.id,
        i.erp_invoice_id,
        i.invoice_number,
        i.msme_id,
        i.buyer_name,
        i.seller_name,
        i.amount,
        i.status,
        i.created_at,
        ec.erp_type
      FROM invoices i
      LEFT JOIN erp_connections ec ON i.erp_connection_id = ec.id
      ORDER BY i.id DESC
      LIMIT 20
    `);

    if (result.rows.length === 0) {
      console.log('❌ No invoices found in database');
      console.log('   Make sure you have synced invoices from your ERP system');
      return;
    }

    console.log(`✓ Found ${result.rows.length} invoices:\n`);
    
    console.log('ID  | ERP ID | Invoice Number    | MSME | Buyer Name           | Amount   | Status | ERP Type');
    console.log('----+--------+-------------------+------+----------------------+----------+--------+---------');
    
    result.rows.forEach(invoice => {
      const id = String(invoice.id).padEnd(3);
      const erpId = String(invoice.erp_invoice_id || 'N/A').padEnd(6);
      const number = String(invoice.invoice_number || 'N/A').padEnd(17);
      const msmeId = String(invoice.msme_id || 'N/A').padEnd(4);
      const buyer = String(invoice.buyer_name || 'N/A').substring(0, 20).padEnd(20);
      const amount = String(invoice.amount || 0).padEnd(8);
      const status = String(invoice.status || 'N/A').padEnd(6);
      const erpType = String(invoice.erp_type || 'N/A').padEnd(8);
      
      console.log(`${id} | ${erpId} | ${number} | ${msmeId} | ${buyer} | ${amount} | ${status} | ${erpType}`);
    });

    console.log('\n📋 Summary:');
    
    // Get statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'posted' THEN 1 END) as posted,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
        COUNT(CASE WHEN giid IS NOT NULL THEN 1 END) as blockchain_registered
      FROM invoices
    `);
    
    const stats = statsResult.rows[0];
    console.log(`   Total invoices: ${stats.total}`);
    console.log(`   Posted invoices: ${stats.posted}`);
    console.log(`   Draft invoices: ${stats.draft}`);
    console.log(`   Blockchain registered: ${stats.blockchain_registered}`);

    // Check if invoice ID 53 exists
    const invoice53 = await db.query('SELECT * FROM invoices WHERE id = $1', [53]);
    if (invoice53.rows.length > 0) {
      console.log(`\n✓ Invoice ID 53 exists:`);
      const inv = invoice53.rows[0];
      console.log(`   Invoice Number: ${inv.invoice_number}`);
      console.log(`   MSME ID: ${inv.msme_id}`);
      console.log(`   ERP Invoice ID: ${inv.erp_invoice_id}`);
      console.log(`   Status: ${inv.status}`);
    } else {
      console.log(`\n❌ Invoice ID 53 does NOT exist in database`);
      console.log(`   This explains why the PDF download is failing`);
    }

  } catch (error) {
    console.error('❌ Error checking invoices:', error.message);
  } finally {
    await db.end();
  }
}

// Run the check
if (require.main === module) {
  checkInvoices();
}

module.exports = { checkInvoices };