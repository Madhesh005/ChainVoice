/**
 * Test lender authentication and API endpoints
 */

const jwt = require('jsonwebtoken');
const { mapEmailToLenderIdentifier } = require('./utils/lenderMapping');

function testLenderAuth() {
  console.log('🧪 Testing Lender Authentication...');
  
  // Test lender mapping
  const testEmails = [
    'hdfc@gmail.com',
    'axis@gmail.com',
    'bajaj@gmail.com',
    'unknown@email.com'
  ];
  
  console.log('\n1. Testing Lender Email Mapping:');
  testEmails.forEach(email => {
    const identifier = mapEmailToLenderIdentifier(email);
    console.log(`   ${email} → ${identifier || 'NOT MAPPED'}`);
  });
  
  // Test JWT token structure
  console.log('\n2. Testing JWT Token Structure:');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  const sampleUser = {
    id: 'test-lender-id',
    email: 'axis@gmail.com',
    lender_name: 'Axis Bank',
    role: 'lender'
  };
  
  const token = jwt.sign(
    { userId: sampleUser.id, role: sampleUser.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  console.log('✅ Sample JWT token generated');
  
  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verification successful');
    console.log('   Decoded payload:', decoded);
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
  }
  
  // Test lender identifier extraction
  console.log('\n3. Testing Lender Identifier Extraction:');
  const lenderIdentifier = mapEmailToLenderIdentifier(sampleUser.email);
  console.log(`   Email: ${sampleUser.email}`);
  console.log(`   Identifier: ${lenderIdentifier}`);
  
  if (lenderIdentifier) {
    console.log('✅ Lender identifier extraction successful');
  } else {
    console.log('❌ Lender identifier extraction failed');
  }
  
  console.log('\n🎉 Lender authentication test completed!');
}

testLenderAuth();