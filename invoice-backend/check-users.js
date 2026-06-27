/**
 * Check Available Users
 * 
 * This script checks what users are available in the database
 */

require('dotenv').config();
const db = require('./db');

async function checkUsers() {
  console.log('👥 Checking available users in database...\n');

  try {
    // Get MSME users
    const msmeResult = await db.query(`
      SELECT 
        id,
        company_name,
        email,
        gstin,
        created_at
      FROM msme_users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('🏢 MSME Users:');
    if (msmeResult.rows.length === 0) {
      console.log('   No MSME users found');
    } else {
      console.log('ID                                   | Company Name         | Email                | GSTIN        | Created');
      console.log('-------------------------------------+----------------------+----------------------+--------------+---------');
      
      msmeResult.rows.forEach(user => {
        const id = String(user.id).substring(0, 36).padEnd(36);
        const company = String(user.company_name || 'N/A').substring(0, 20).padEnd(20);
        const email = String(user.email || 'N/A').substring(0, 20).padEnd(20);
        const gstin = String(user.gstin || 'N/A').substring(0, 12).padEnd(12);
        const created = user.created_at ? user.created_at.toISOString().split('T')[0] : 'N/A';
        
        console.log(`${id} | ${company} | ${email} | ${gstin} | ${created}`);
      });
    }

    // Get Lender users
    const lenderResult = await db.query(`
      SELECT 
        id,
        institution_name,
        email,
        license_number,
        created_at
      FROM lender_users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n🏦 Lender Users:');
    if (lenderResult.rows.length === 0) {
      console.log('   No lender users found');
    } else {
      console.log('ID                                   | Institution Name     | Email                | License      | Created');
      console.log('-------------------------------------+----------------------+----------------------+--------------+---------');
      
      lenderResult.rows.forEach(user => {
        const id = String(user.id).substring(0, 36).padEnd(36);
        const institution = String(user.institution_name || 'N/A').substring(0, 20).padEnd(20);
        const email = String(user.email || 'N/A').substring(0, 20).padEnd(20);
        const license = String(user.license_number || 'N/A').substring(0, 12).padEnd(12);
        const created = user.created_at ? user.created_at.toISOString().split('T')[0] : 'N/A';
        
        console.log(`${id} | ${institution} | ${email} | ${license} | ${created}`);
      });
    }

    // Check which MSME owns invoice 53
    const invoiceOwnerResult = await db.query(`
      SELECT 
        i.id as invoice_id,
        i.invoice_number,
        i.msme_id,
        m.company_name,
        m.email
      FROM invoices i
      LEFT JOIN msme_users m ON i.msme_id = m.id
      WHERE i.id = 53
    `);

    console.log('\n📄 Invoice 53 Owner:');
    if (invoiceOwnerResult.rows.length === 0) {
      console.log('   Invoice 53 not found');
    } else {
      const invoice = invoiceOwnerResult.rows[0];
      console.log(`   Invoice ID: ${invoice.invoice_id}`);
      console.log(`   Invoice Number: ${invoice.invoice_number}`);
      console.log(`   MSME ID: ${invoice.msme_id}`);
      console.log(`   Company: ${invoice.company_name || 'N/A'}`);
      console.log(`   Email: ${invoice.email || 'N/A'}`);
    }

  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await db.end();
  }
}

// Run the check
if (require.main === module) {
  checkUsers();
}

module.exports = { checkUsers };