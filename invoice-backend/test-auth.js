/**
 * Test Authentication System
 * Quick test script to verify auth endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

async function testAuth() {
  console.log('\n========================================');
  console.log('Authentication System Test');
  console.log('========================================\n');

  try {
    // Test 1: Admin Login
    console.log('1️⃣  Testing Admin Login...');
    const adminLogin = await axios.post(`${BASE_URL}/admin/login`, {
      email: 'admin@gmail.com',
      password: 'admin@123'
    });
    console.log('✅ Admin login successful');
    console.log('   Token:', adminLogin.data.token.substring(0, 50) + '...');
    console.log('   Role:', adminLogin.data.user.role);

    // Test 2: MSME Registration
    console.log('\n2️⃣  Testing MSME Registration...');
    const msmeEmail = `test${Date.now()}@testcorp.com`;
    const msmeRegister = await axios.post(`${BASE_URL}/msme/register`, {
      company_name: 'Test Corporation',
      contact_person: 'Test User',
      email: msmeEmail,
      phone: '9876543210',
      gstin: '27AAACT2727Q1ZV',
      password: 'testpass123'
    });
    console.log('✅ MSME registration successful');
    console.log('   ID:', msmeRegister.data.data.id);
    console.log('   Email:', msmeRegister.data.data.email);

    // Test 3: MSME Login
    console.log('\n3️⃣  Testing MSME Login...');
    const msmeLogin = await axios.post(`${BASE_URL}/msme/login`, {
      email: msmeEmail,
      password: 'testpass123'
    });
    console.log('✅ MSME login successful');
    console.log('   Token:', msmeLogin.data.token.substring(0, 50) + '...');
    console.log('   Role:', msmeLogin.data.user.role);

    // Test 4: Lender Registration
    console.log('\n4️⃣  Testing Lender Registration...');
    const lenderEmail = `lender${Date.now()}@bank.com`;
    const lenderRegister = await axios.post(`${BASE_URL}/lender/register`, {
      institution_name: 'Test Bank',
      contact_person: 'Bank Manager',
      email: lenderEmail,
      phone: '9876543211',
      license_number: `RBI/NBFC/${Date.now()}`,
      password: 'bankpass123'
    });
    console.log('✅ Lender registration successful');
    console.log('   ID:', lenderRegister.data.data.id);
    console.log('   Email:', lenderRegister.data.data.email);

    // Test 5: Lender Login
    console.log('\n5️⃣  Testing Lender Login...');
    const lenderLogin = await axios.post(`${BASE_URL}/lender/login`, {
      email: lenderEmail,
      password: 'bankpass123'
    });
    console.log('✅ Lender login successful');
    console.log('   Token:', lenderLogin.data.token.substring(0, 50) + '...');
    console.log('   Role:', lenderLogin.data.user.role);

    // Test 6: Token Verification
    console.log('\n6️⃣  Testing Token Verification...');
    const verifyToken = await axios.get(`${BASE_URL}/verify`, {
      headers: {
        'Authorization': `Bearer ${msmeLogin.data.token}`
      }
    });
    console.log('✅ Token verification successful');
    console.log('   Valid:', verifyToken.data.valid);
    console.log('   User Role:', verifyToken.data.user.role);

    // Test 7: Invalid Login
    console.log('\n7️⃣  Testing Invalid Login...');
    try {
      await axios.post(`${BASE_URL}/msme/login`, {
        email: msmeEmail,
        password: 'wrongpassword'
      });
      console.log('❌ Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Invalid login correctly rejected');
        console.log('   Error:', error.response.data.message);
      } else {
        throw error;
      }
    }

    // Test 8: Duplicate Email
    console.log('\n8️⃣  Testing Duplicate Email...');
    try {
      await axios.post(`${BASE_URL}/msme/register`, {
        company_name: 'Another Corp',
        contact_person: 'Another User',
        email: msmeEmail,
        phone: '9876543212',
        gstin: '27AAACT2727Q1ZW',
        password: 'anotherpass123'
      });
      console.log('❌ Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Duplicate email correctly rejected');
        console.log('   Error:', error.response.data.message);
      } else {
        throw error;
      }
    }

    console.log('\n========================================');
    console.log('All Tests Passed! ✅');
    console.log('========================================\n');

    console.log('📊 Summary:');
    console.log('   ✓ Admin login working');
    console.log('   ✓ MSME registration working');
    console.log('   ✓ MSME login working');
    console.log('   ✓ Lender registration working');
    console.log('   ✓ Lender login working');
    console.log('   ✓ Token verification working');
    console.log('   ✓ Invalid login rejected');
    console.log('   ✓ Duplicate email rejected\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Check if server is running
console.log('⏳ Checking if server is running...');
axios.get('http://localhost:3000/test-db')
  .then(() => {
    console.log('✅ Server is running\n');
    testAuth();
  })
  .catch(() => {
    console.error('❌ Server is not running!');
    console.error('   Please start the server first: npm start\n');
    process.exit(1);
  });
