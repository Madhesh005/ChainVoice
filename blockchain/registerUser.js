/**
 * Register Application User
 * 
 * This script registers and enrolls an application user using the admin identity.
 * It is idempotent - running it multiple times will not corrupt the wallet.
 * 
 * Prerequisites: Admin must be enrolled first (run enrollAdmin.js)
 * Usage: node registerUser.js [username]
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const config = require('./config');

/**
 * Reads the connection profile
 * @returns {Object} Connection profile JSON
 */
function readConnectionProfile() {
  const ccpPath = config.connectionProfilePath;
  
  if (!fs.existsSync(ccpPath)) {
    throw new Error(`Connection profile not found at: ${ccpPath}`);
  }
  
  const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
  return JSON.parse(ccpJSON);
}

/**
 * Main registration function
 * @param {string} username - Username to register (defaults to appUser from config)
 */
async function registerUser(username = null) {
  try {
    const userName = username || config.appUser;
    
    console.log('\n👤 Registering Application User');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Step 1: Load connection profile
    console.log('📄 Loading connection profile...');
    const ccp = readConnectionProfile();
    console.log(`✅ Connection profile loaded\n`);
    
    // Step 2: Get CA info
    const caInfo = ccp.certificateAuthorities[`ca.${config.orgName.toLowerCase()}.example.com`];
    if (!caInfo) {
      throw new Error(`CA info not found for ${config.orgName}`);
    }
    
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );
    
    console.log(`📡 Certificate Authority: ${caInfo.url}\n`);
    
    // Step 3: Open wallet
    console.log('💼 Opening wallet...');
    const walletPath = config.walletPath;
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`✅ Wallet loaded from: ${walletPath}\n`);
    
    // Step 4: Check if user already exists (idempotency)
    const userIdentity = await wallet.get(userName);
    if (userIdentity) {
      console.log(`⚠️  User identity '${userName}' already exists in wallet`);
      console.log('✅ Registration skipped (idempotent operation)\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ User registration check completed successfully\n');
      return;
    }
    
    // Step 5: Check for admin identity
    console.log('🔍 Looking for admin identity...');
    const adminIdentity = await wallet.get(config.adminUser);
    if (!adminIdentity) {
      throw new Error(
        `Admin identity '${config.adminUser}' not found in wallet. ` +
        'Please run enrollAdmin.js first.'
      );
    }
    console.log(`✅ Admin identity found: ${config.adminUser}\n`);
    
    // Step 6: Build user provider from admin identity
    console.log('🔐 Creating admin user context...');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, config.adminUser);
    console.log('✅ Admin user context created\n');
    
    // Step 7: Register the user with CA
    console.log(`📝 Registering user with CA: ${userName}`);
    const secret = await ca.register(
      {
        affiliation: `${config.orgName.toLowerCase()}.department1`,
        enrollmentID: userName,
        role: 'client',
        attrs: [
          { name: 'role', value: 'client', ecert: true },
          { name: 'org', value: config.orgName, ecert: true }
        ]
      },
      adminUser
    );
    console.log('✅ User registered successfully with CA\n');
    console.log(`🔑 Registration secret: ${secret}\n`);
    
    // Step 8: Enroll the user
    console.log(`📥 Enrolling user: ${userName}`);
    const enrollment = await ca.enroll({
      enrollmentID: userName,
      enrollmentSecret: secret
    });
    console.log('✅ User enrolled successfully\n');
    
    // Step 9: Create X.509 identity
    console.log('📜 Creating X.509 identity...');
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: config.orgMspId,
      type: 'X.509',
    };
    console.log(`✅ X.509 identity created\n`);
    
    // Step 10: Import identity into wallet
    console.log('💾 Storing identity in wallet...');
    await wallet.put(userName, x509Identity);
    console.log(`✅ User identity stored: ${userName}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ User registration completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   • Username: ${userName}`);
    console.log(`   • Organization: ${config.orgName} (${config.orgMspId})`);
    console.log(`   • Wallet Path: ${walletPath}`);
    console.log(`   • Identity Type: X.509`);
    console.log(`   • Affiliation: ${config.orgName.toLowerCase()}.department1`);
    console.log('\n✅ You can now use this identity to submit transactions\n');
    
  } catch (error) {
    console.error('\n❌ Failed to register user:');
    console.error(`   Error: ${error.message}\n`);
    
    if (config.debug) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    // Provide helpful troubleshooting tips
    console.log('💡 Troubleshooting tips:');
    console.log('   1. Ensure admin is enrolled: node enrollAdmin.js');
    console.log('   2. Verify Fabric CA is running: docker ps | grep ca');
    console.log('   3. Check wallet path is correct');
    console.log('   4. Verify CA is accessible at configured URL');
    console.log('   5. Check admin credentials are valid\n');
    
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  // Allow passing username as command-line argument
  const username = process.argv[2];
  
  registerUser(username)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { registerUser };
