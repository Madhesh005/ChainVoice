const axios = require('axios');
const db = require('./db');

async function testOdooSync() {
  try {
    console.log('🧪 Testing Odoo sync functionality...');
    
    // Use the MSME user that has ERP connections
    const msmeUsers = await db.query('SELECT id, email FROM msme_users WHERE id = $1', ['cf4dd4b6-10f3-40e8-91a3-d0168e53acaa']);
    
    if (msmeUsers.rows.length === 0) {
      console.log('❌ No MSME users found');
      return;
    }
    
    const msmeUser = msmeUsers.rows[0];
    console.log(`✅ Found MSME user: ${msmeUser.email}`);
    
    // Check ERP connections
    const erpConnections = await db.query('SELECT id, erp_type, base_url FROM erp_connections WHERE msme_id = $1', [msmeUser.id]);
    
    if (erpConnections.rows.length === 0) {
      console.log('❌ No ERP connections found for this MSME');
      return;
    }
    
    const erpConnection = erpConnections.rows[0];
    console.log(`✅ Found ERP connection: ${erpConnection.erp_type} at ${erpConnection.base_url} (ID: ${erpConnection.id})`);
    
    // Create a test JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: msmeUser.id, email: msmeUser.email, role: 'msme' }, 
      process.env.JWT_SECRET || 'invoice_registry_super_secret_key_change_in_production_2024',
      { expiresIn: '1h' }
    );
    
    console.log('🔑 Generated test JWT token');
    
    // Test the sync endpoint
    try {
      console.log(`📡 Testing sync for ERP connection ${erpConnection.id}...`);
      
      const response = await axios.post(`http://localhost:3000/api/erp/sync/${erpConnection.id}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Sync test successful!');
      console.log('📊 Response:', {
        success: response.data.success,
        message: response.data.message,
        stats: response.data.stats || 'No stats provided'
      });
      
    } catch (syncError) {
      if (syncError.response) {
        console.log('❌ Sync API Error:', {
          status: syncError.response.status,
          data: syncError.response.data
        });
      } else {
        console.log('❌ Sync Network Error:', syncError.message);
      }
    }
    
    // Check if any invoices were synced
    const invoiceCount = await db.query('SELECT COUNT(*) as count FROM invoices WHERE msme_id = $1', [msmeUser.id]);
    console.log(`📋 Total invoices for this MSME: ${invoiceCount.rows[0].count}`);
    
    // Check if seller_name is being populated
    const invoicesWithSellerName = await db.query(`
      SELECT invoice_number, seller_name, seller_gstin 
      FROM invoices 
      WHERE msme_id = $1 AND seller_name IS NOT NULL 
      LIMIT 3
    `, [msmeUser.id]);
    
    if (invoicesWithSellerName.rows.length > 0) {
      console.log('✅ Invoices with seller_name:');
      invoicesWithSellerName.rows.forEach(inv => {
        console.log(`  ${inv.invoice_number}: ${inv.seller_name} (GSTIN: ${inv.seller_gstin})`);
      });
    } else {
      console.log('⚠️  No invoices found with seller_name populated');
    }
    
    await db.end();
    console.log('🎉 Odoo sync test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testOdooSync();