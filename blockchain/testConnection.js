/**
 * Test Blockchain Connection
 * 
 * This script tests the complete connection flow to Hyperledger Fabric:
 * 1. Load wallet
 * 2. Connect gateway
 * 3. Connect to network/channel
 * 4. Load contract
 * 5. Execute read-only transaction
 * 6. Disconnect
 * 
 * Prerequisites:
 * - Fabric network must be running
 * - Admin must be enrolled
 * - App user must be registered
 * - Chaincode must be deployed
 * 
 * Usage: node testConnection.js [username]
 */

const { Gateway, Wallets } = require('fabric-network');
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
 * Main connection test function
 * @param {string} username - Username to use for connection
 */
async function testConnection(username = null) {
  const userName = username || config.appUser;
  const gateway = new Gateway();
  
  try {
    console.log('\n🔗 Testing Blockchain Connection');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Step 1: Load wallet
    console.log('Step 1/6: Loading wallet...');
    const walletPath = config.walletPath;
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`✅ Wallet loaded from: ${walletPath}`);
    
    // Verify user identity exists
    const identity = await wallet.get(userName);
    if (!identity) {
      throw new Error(
        `Identity '${userName}' not found in wallet. ` +
        'Please run registerUser.js first.'
      );
    }
    console.log(`✅ Identity found: ${userName}\n`);
    
    // Step 2: Load connection profile
    console.log('Step 2/6: Loading connection profile...');
    const ccp = readConnectionProfile();
    console.log(`✅ Connection profile loaded\n`);
    
    // Step 3: Connect gateway
    console.log('Step 3/6: Connecting to gateway...');
    await gateway.connect(ccp, {
      wallet,
      identity: userName,
      discovery: {
        enabled: true,
        asLocalhost: true
      },
      eventHandlerOptions: {
        commitTimeout: config.transactionTimeout,
        endorseTimeout: config.connectionTimeout,
      }
    });
    console.log('✅ Gateway connected\n');
    
    // Step 4: Get network/channel
    console.log(`Step 4/6: Connecting to channel '${config.channelName}'...`);
    const network = await gateway.getNetwork(config.channelName);
    console.log(`✅ Network connected: ${config.channelName}\n`);
    
    // Step 5: Get contract/chaincode
    console.log(`Step 5/6: Loading contract '${config.chaincodeName}'...`);
    const contract = network.getContract(config.chaincodeName);
    console.log(`✅ Contract loaded: ${config.chaincodeName}\n`);
    
    // Step 6: Execute test transaction (read-only)
    console.log('Step 6/6: Executing test transaction...');
    console.log('   Function: GetAllInvoices()');
    
    const startTime = Date.now();
    const result = await contract.evaluateTransaction('GetAllInvoices');
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Handle empty response (when ledger has no invoices yet)
    const resultString = result.toString();
    const invoices = resultString === '' ? [] : JSON.parse(resultString);
    console.log(`✅ Transaction executed successfully (${duration}ms)\n`);
    
    // Display results
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Results:\n');
    console.log(`   Invoices found: ${invoices.length}`);
    
    if (invoices.length > 0) {
      console.log('\n   Sample invoice:');
      const sample = invoices[0];
      console.log(`   • Hash (GIID): ${sample.hash}`);
      console.log(`   • Number: ${sample.number}`);
      console.log(`   • Status: ${sample.status}`);
      console.log(`   • Created: ${sample.createdAt}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Connection test PASSED!\n');
    console.log('📋 Connection Summary:');
    console.log(`   • User: ${userName}`);
    console.log(`   • Organization: ${config.orgMspId}`);
    console.log(`   • Channel: ${config.channelName}`);
    console.log(`   • Chaincode: ${config.chaincodeName}`);
    console.log(`   • Query Time: ${duration}ms`);
    console.log(`   • Total Invoices: ${invoices.length}`);
    console.log('\n✅ Blockchain layer is operational!\n');
    
  } catch (error) {
    console.error('\n❌ Connection test FAILED!');
    console.error(`   Error: ${error.message}\n`);
    
    if (config.debug) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    // Identify which stage failed
    console.log('💡 Failure Analysis:');
    
    if (error.message.includes('not found in wallet')) {
      console.log('   ❌ Stage: Wallet / Identity');
      console.log('   • Run: node registerUser.js');
    } else if (error.message.includes('connection profile')) {
      console.log('   ❌ Stage: Connection Profile');
      console.log('   • Check: connection-org1.json exists');
      console.log('   • Verify: Paths are correct');
    } else if (error.message.includes('gateway') || error.message.includes('connect')) {
      console.log('   ❌ Stage: Gateway Connection');
      console.log('   • Check: Fabric network is running');
      console.log('   • Verify: docker ps shows peer and orderer');
      console.log('   • Check: Peer ports are accessible (7051, 9051)');
    } else if (error.message.includes('channel') || error.message.includes('network')) {
      console.log('   ❌ Stage: Channel/Network');
      console.log('   • Check: Channel exists and peer joined');
      console.log('   • Verify: peer channel list');
    } else if (error.message.includes('chaincode') || error.message.includes('contract')) {
      console.log('   ❌ Stage: Contract/Chaincode');
      console.log('   • Check: Chaincode is deployed');
      console.log('   • Verify: peer lifecycle chaincode queryinstalled');
      console.log('   • Verify: peer lifecycle chaincode querycommitted -C mychannel');
    } else {
      console.log('   ❌ Stage: Transaction Execution');
      console.log('   • Check: Chaincode logs for errors');
      console.log('   • Verify: Transaction function exists');
    }
    
    console.log('\n💡 General Troubleshooting:');
    console.log('   1. Check network: docker ps');
    console.log('   2. Check logs: docker logs peer0.org1.example.com');
    console.log('   3. Run health check: node healthCheck.js');
    console.log('   4. Verify discovery: Check connection profile has correct peer addresses\n');
    
    process.exit(1);
  } finally {
    // Step 7: Disconnect gateway
    if (gateway) {
      console.log('🔌 Disconnecting gateway...');
      gateway.disconnect();
      console.log('✅ Gateway disconnected\n');
    }
  }
}

// Execute if run directly
if (require.main === module) {
  // Allow passing username as command-line argument
  const username = process.argv[2];
  
  testConnection(username)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testConnection };
