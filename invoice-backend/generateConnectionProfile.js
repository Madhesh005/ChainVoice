/**
 * Generate connection profile from Fabric test network
 * Run this after starting the test network
 */

const fs = require('fs');
const path = require('path');

function generateConnectionProfile() {
  const fabricSamplesPath = process.env.FABRIC_SAMPLES_PATH || '../fabric-samples';
  const testNetworkPath = path.join(fabricSamplesPath, 'test-network');

  console.log('Generating connection profile...');
  console.log(`Looking for certificates in: ${testNetworkPath}`);

  try {
    // Read peer TLS cert
    const peerTLSCertPath = path.join(
      testNetworkPath,
      'organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt'
    );
    const peerTLSCert = fs.readFileSync(peerTLSCertPath, 'utf8');

    // Read CA TLS cert
    const caTLSCertPath = path.join(
      testNetworkPath,
      'organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem'
    );
    const caTLSCert = fs.readFileSync(caTLSCertPath, 'utf8');

    // Create connection profile
    const connectionProfile = {
      name: 'test-network-org1',
      version: '1.0.0',
      client: {
        organization: 'Org1',
        connection: {
          timeout: {
            peer: {
              endorser: '300'
            }
          }
        }
      },
      organizations: {
        Org1: {
          mspid: 'Org1MSP',
          peers: ['peer0.org1.example.com'],
          certificateAuthorities: ['ca.org1.example.com']
        }
      },
      peers: {
        'peer0.org1.example.com': {
          url: 'grpcs://localhost:7051',
          tlsCACerts: {
            pem: peerTLSCert
          },
          grpcOptions: {
            'ssl-target-name-override': 'peer0.org1.example.com',
            hostnameOverride: 'peer0.org1.example.com'
          }
        }
      },
      certificateAuthorities: {
        'ca.org1.example.com': {
          url: 'https://localhost:7054',
          caName: 'ca-org1',
          tlsCACerts: {
            pem: caTLSCert
          },
          httpOptions: {
            verify: false
          }
        }
      }
    };

    // Write connection profile
    const outputPath = path.join(__dirname, 'connection-org1.json');
    fs.writeFileSync(outputPath, JSON.stringify(connectionProfile, null, 2));

    console.log('✓ Connection profile generated successfully!');
    console.log(`  Saved to: ${outputPath}`);
    console.log('\nNext steps:');
    console.log('1. Run: node enrollUser.js');
    console.log('2. Update server.js to use FabricLedger');
    console.log('3. Start server: npm start');

  } catch (error) {
    console.error('❌ Error generating connection profile:', error.message);
    console.log('\nMake sure:');
    console.log('1. Fabric test network is running');
    console.log('2. FABRIC_SAMPLES_PATH environment variable is set (or fabric-samples is in parent directory)');
    console.log('3. Certificates exist in the test network');
    process.exit(1);
  }
}

generateConnectionProfile();
