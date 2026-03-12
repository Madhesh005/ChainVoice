/**
 * Enroll user for Fabric network access
 * Run this after starting the Fabric network
 */

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollUser() {
  try {
    // Load connection profile
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create CA client
    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    // Create wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // Check if admin exists
    let adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.log('Admin identity not found. Enrolling admin...');
      
      // Enroll admin
      const enrollment = await ca.enroll({ 
        enrollmentID: 'admin', 
        enrollmentSecret: 'adminpw' 
      });
      
      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: 'Org1MSP',
        type: 'X.509',
      };
      
      await wallet.put('admin', x509Identity);
      console.log('✓ Admin enrolled and imported to wallet');
      
      // Re-fetch admin identity
      adminIdentity = await wallet.get('admin');
    } else {
      console.log('✓ Admin identity already exists');
    }

    // Check if appUser exists
    const appUserIdentity = await wallet.get('appUser');
    if (!appUserIdentity) {
      console.log('App user identity not found. Registering and enrolling appUser...');
      
      try {
        // Build user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        // Try to register the user
        let secret;
        try {
          secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
          }, adminUser);
          console.log(`✓ App user registered successfully`);
        } catch (registerError) {
          if (registerError.message.includes('already registered')) {
            console.log('⚠️  App user already registered in CA');
            console.log('   This means the CA database has stale state.');
            console.log('   You need to restart the Fabric network with clean state:');
            console.log('');
            console.log('   cd ../fabric-samples/test-network');
            console.log('   ./network.sh down');
            console.log('   docker volume prune -f');
            console.log('   ./network.sh up createChannel');
            console.log('   ./network.sh deployCC -ccn invoicecc -ccp ../../invoice-backend/chaincode -ccl go');
            console.log('');
            console.log('   Then run this script again.');
            throw new Error('CA state is inconsistent - network restart required');
          } else {
            throw registerError;
          }
        }

        // Enroll the user
        const enrollment = await ca.enroll({
          enrollmentID: 'appUser',
          enrollmentSecret: secret
        });

        const x509Identity = {
          credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
          },
          mspId: 'Org1MSP',
          type: 'X.509',
        };

        await wallet.put('appUser', x509Identity);
        console.log('✓ App user enrolled and imported to wallet');
      } catch (enrollError) {
        console.error('❌ Failed to enroll appUser:', enrollError.message);
        throw enrollError;
      }
    } else {
      console.log('✓ App user identity already exists');
    }

    console.log('\n✅ User enrollment complete!');
    console.log('You can now use the Fabric ledger implementation.');

  } catch (error) {
    console.error(`\n❌ Failed to enroll user: ${error.message}`);
    process.exit(1);
  }
}

enrollUser();
