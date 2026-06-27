/**
 * Create Test User for PDF Download Testing
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function createTestUser() {
  console.log('👤 Creating test MSME user for PDF download testing...\n');

  try {
    const userData = {
      company_name: 'Test PDF Company',
      contact_person: 'Test User',
      email: 'test-pdf@example.com',
      phone: '+91-9876543210',
      gstin: '27TESTPDF123',
      password: 'testpdf123'
    };

    console.log('📝 Registering new MSME user...');
    console.log(`   Company: ${userData.company_name}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Password: ${userData.password}`);

    const response = await axios.post(`${API_BASE_URL}/api/auth/msme/register`, userData);

    if (response.data.success) {
      console.log('✅ Test user created successfully!');
      console.log(`   User ID: ${response.data.user.id}`);
      console.log(`   Company: ${response.data.user.company_name}`);
      console.log(`   Email: ${response.data.user.email}`);
      
      console.log('\n🔑 Login credentials for testing:');
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
      
      console.log('\n⚠️  Note: This user won\'t have any invoices or ERP connections.');
      console.log('   To test PDF download, you\'ll need to:');
      console.log('   1. Set up an ERP connection for this user');
      console.log('   2. Sync some invoices');
      console.log('   3. Or use the existing msme1@gmail.com user with the correct password');
      
    } else {
      console.error('❌ Failed to create test user:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the script
if (require.main === module) {
  createTestUser();
}

module.exports = { createTestUser };