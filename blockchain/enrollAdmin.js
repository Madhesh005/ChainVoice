/**
 * Enroll Admin Identity
 * 
 * This script enrolls the admin user with the Fabric CA and stores the identity in the wallet.
 * It is idempotent - running it multiple times will not corrupt the wallet.
 * 
 * Usage: node enrollAdmin.js
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
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
 * Main enrollment function
 */
async function enrollAdmin() {
  try {
    console.log('\n🔐 Enrolling Admin Identity');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Step 1: Load connection profile
    console.log('📄 Loading connection profile...');
    const ccp = readConnectionProfile();
    console.log(`✅ Connection profile loaded from: ${config.connectionProfilePath}\n`);
    
    // Step 2: Get CA info from connection profile
    const caInfo = ccp.certificateAuthorities[`ca.${config.orgName.toLowerCase()}.example.com`];
    if (!caInfo) {
      throw new Error(`CA info not found for ${config.orgName} in connection profile`);
    }
    
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );
    
    console.log(`📡 Certificate Authority: ${caInfo.url}`);
    console.log(`🏢 CA Name: ${caInfo.caName}\n`);
    
    // Step 3: Create wallet
    console.log('💼 Setting up wallet...');
    const walletPath = config.walletPath;
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`✅ Wallet initialized at: ${walletPath}\n`);
    
    // Step 4: Check if admin already exists (idempotency)
    const adminIdentity = await wallet.get(config.adminUser);
    if (adminIdentity) {
      console.log(`⚠️  Admin identity '${config.adminUser}' already exists in wallet`);
      console.log('✅ Enrollment skipped (idempotent operation)\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Admin enrollment check completed successfully\n');
      return;
    }
    
    // Step 5: Enroll admin
    console.log(`🔑 Enrolling admin user: ${config.adminUser}`);
    const enrollment = await ca.enroll({
      enrollmentID: config.adminUser,
      enrollmentSecret: config.adminPassword
    });
    console.log('✅ Admin enrolled successfully with CA\n');
    
    // Step 6: Create X.509 identity
    console.log('📜 Creating X.509 identity...');
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: config.orgMspId,
      type: 'X.509',
    };
    console.log(`✅ X.509 identity created for MSP: ${config.orgMspId}\n`);
    
    // Step 7: Import identity into wallet
    console.log('💾 Storing identity in wallet...');
    await wallet.put(config.adminUser, x509Identity);
    console.log(`✅ Admin identity stored in wallet: ${config.adminUser}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Admin enrollment completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   • Admin User: ${config.adminUser}`);
    console.log(`   • Organization: ${config.orgName} (${config.orgMspId})`);
    console.log(`   • Wallet Path: ${walletPath}`);
    console.log(`   • Identity Type: X.509`);
    console.log('\n✅ You can now register application users\n');
    
  } catch (error) {
    console.error('\n❌ Failed to enroll admin:');
    console.error(`   Error: ${error.message}\n`);
    
    if (config.debug) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    // Provide helpful troubleshooting tips
    console.log('💡 Troubleshooting tips:');
    console.log('   1. Verify Fabric CA is running: docker ps | grep ca');
    console.log('   2. Check CA URL in .env file matches docker-compose');
    console.log('   3. Verify admin credentials (default: admin/adminpw)');
    console.log('   4. Check connection profile CA configuration');
    console.log('   5. Ensure network is up: cd fabric-samples/test-network && ./network.sh up\n');
    
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  enrollAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { enrollAdmin };
