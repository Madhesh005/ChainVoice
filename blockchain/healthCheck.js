/**
 * Blockchain Health Check
 * 
 * Comprehensive health check for Hyperledger Fabric network.
 * Verifies all critical components before allowing backend to connect.
 * 
 * Usage: node healthCheck.js
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const { Wallets, Gateway } = require('fabric-network');
const config = require('./config');

const execPromise = util.promisify(exec);

// Health check results
const results = {
  docker: false,
  channel: false,
  chaincode_installed: false,
  chaincode_committed: false,
  wallet: false,
  gateway: false,
  discovery: false,
  query: false,
};

/**
 * Prints a health check step
 */
function printStep(name, status, details = '') {
  const icon = status ? '✅' : '❌';
  console.log(`${icon} ${name.padEnd(30)} ${status ? 'PASS' : 'FAIL'}`);
  if (details && !status) {
    console.log(`   ${details}`);
  }
}

/**
 * Check 1: Docker Containers Running
 */
async function checkDocker() {
  try {
    const { stdout } = await execPromise('docker ps --format "{{.Names}}"');
    const containers = stdout.split('\n').filter(Boolean);
    
    const requiredContainers = [
      'peer0.org1.example.com',
      'orderer.example.com',
      'ca_org1'
    ];
    
    const running = requiredContainers.every(name => 
      containers.some(c => c.includes(name))
    );
    
    results.docker = running;
    
    if (!running) {
      const missing = requiredContainers.filter(name => 
        !containers.some(c => c.includes(name))
      );
      return `Missing containers: ${missing.join(', ')}`;
    }
    
    return '';
  } catch (error) {
    results.docker = false;
    return 'Docker not accessible or not running';
  }
}

/**
 * Check 2: Channel Exists
 */
async function checkChannel() {
  try {
    const cmd = `docker exec peer0.org1.example.com peer channel list`;
    const { stdout } = await execPromise(cmd);
    
    results.channel = stdout.includes(config.channelName);
    
    if (!results.channel) {
      return `Channel '${config.channelName}' not found`;
    }
    
    return '';
  } catch (error) {
    results.channel = false;
    return 'Cannot check channel list';
  }
}

/**
 * Check 3: Chaincode Installed
 */
async function checkChaincodeInstalled() {
  try {
    const cmd = `docker exec peer0.org1.example.com peer lifecycle chaincode queryinstalled`;
    const { stdout } = await execPromise(cmd);
    
    results.chaincode_installed = stdout.includes(config.chaincodeName);
    
    if (!results.chaincode_installed) {
      return `Chaincode '${config.chaincodeName}' not installed`;
    }
    
    return '';
  } catch (error) {
    results.chaincode_installed = false;
    return 'Cannot query installed chaincode';
  }
}

/**
 * Check 4: Chaincode Committed
 */
async function checkChaincodeCommitted() {
  try {
    const cmd = `docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C ${config.channelName}`;
    const { stdout } = await execPromise(cmd);
    
    results.chaincode_committed = stdout.includes(config.chaincodeName);
    
    if (!results.chaincode_committed) {
      return `Chaincode '${config.chaincodeName}' not committed to channel`;
    }
    
    return '';
  } catch (error) {
    results.chaincode_committed = false;
    return 'Cannot query committed chaincode';
  }
}

/**
 * Check 5: Wallet Exists
 */
async function checkWallet() {
  try {
    if (!fs.existsSync(config.walletPath)) {
      results.wallet = false;
      return 'Wallet directory does not exist';
    }
    
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);
    const identity = await wallet.get(config.appUser);
    
    results.wallet = identity !== undefined;
    
    if (!results.wallet) {
      return `User '${config.appUser}' not found in wallet`;
    }
    
    return '';
  } catch (error) {
    results.wallet = false;
    return `Wallet error: ${error.message}`;
  }
}

/**
 * Check 6: Gateway Connects
 */
async function checkGateway() {
  const gateway = new Gateway();
  
  try {
    if (!fs.existsSync(config.connectionProfilePath)) {
      results.gateway = false;
      return 'Connection profile not found';
    }
    
    const ccp = JSON.parse(fs.readFileSync(config.connectionProfilePath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);
    
    await gateway.connect(ccp, {
      wallet,
      identity: config.appUser,
      discovery: { enabled: true, asLocalhost: true },
      eventHandlerOptions: {
        commitTimeout: 10000,
        endorseTimeout: 10000,
      }
    });
    
    results.gateway = true;
    return '';
  } catch (error) {
    results.gateway = false;
    return `Gateway connection failed: ${error.message}`;
  } finally {
    gateway.disconnect();
  }
}

/**
 * Check 7: Discovery Works
 */
async function checkDiscovery() {
  const gateway = new Gateway();
  
  try {
    const ccp = JSON.parse(fs.readFileSync(config.connectionProfilePath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);
    
    await gateway.connect(ccp, {
      wallet,
      identity: config.appUser,
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork(config.channelName);
    
    results.discovery = network !== null;
    return '';
  } catch (error) {
    results.discovery = false;
    return `Discovery failed: ${error.message}`;
  } finally {
    gateway.disconnect();
  }
}

/**
 * Check 8: Query Works
 */
async function checkQuery() {
  const gateway = new Gateway();
  
  try {
    const ccp = JSON.parse(fs.readFileSync(config.connectionProfilePath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);
    
    await gateway.connect(ccp, {
      wallet,
      identity: config.appUser,
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork(config.channelName);
    const contract = network.getContract(config.chaincodeName);
    
    await contract.evaluateTransaction('GetAllInvoices');
    
    results.query = true;
    return '';
  } catch (error) {
    results.query = false;
    return `Query failed: ${error.message}`;
  } finally {
    gateway.disconnect();
  }
}

/**
 * Main health check function
 */
async function runHealthCheck() {
  console.log('\n🏥 Blockchain Health Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Infrastructure Checks
  console.log('Infrastructure:');
  printStep('Docker Containers', false, await checkDocker());
  printStep('Channel Exists', false, await checkChannel());
  printStep('Chaincode Installed', false, await checkChaincodeInstalled());
  printStep('Chaincode Committed', false, await checkChaincodeCommitted());
  
  console.log('\nIdentity & Connection:');
  printStep('Wallet & Identity', false, await checkWallet());
  printStep('Gateway Connection', false, await checkGateway());
  printStep('Service Discovery', false, await checkDiscovery());
  printStep('Query Execution', false, await checkQuery());
  
  // Update results
  results.docker = results.docker || false;
  results.channel = results.channel || false;
  results.chaincode_installed = results.chaincode_installed || false;
  results.chaincode_committed = results.chaincode_committed || false;
  results.wallet = results.wallet || false;
  results.gateway = results.gateway || false;
  results.discovery = results.discovery || false;
  results.query = results.query || false;
  
  // Summary
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  const allPassed = passed === total;
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Health Check Results: ${passed}/${total} checks passed\n`);
  
  if (allPassed) {
    console.log('✅ All checks PASSED - Blockchain is ready!\n');
    console.log('You can now:');
    console.log('  • Start your backend application');
    console.log('  • Submit transactions');
    console.log('  • Connect additional services\n');
    return true;
  } else {
    console.log('❌ Some checks FAILED - Please fix issues before connecting backend\n');
    console.log('💡 Troubleshooting Steps:\n');
    
    if (!results.docker) {
      console.log('1. Start Fabric network:');
      console.log('   cd fabric-samples/test-network');
      console.log('   ./network.sh up createChannel -c mychannel\n');
    }
    
    if (!results.chaincode_installed || !results.chaincode_committed) {
      console.log('2. Deploy chaincode:');
      console.log('   ./network.sh deployCC -ccn invoicecc -ccp ../../chaincode -ccl go\n');
    }
    
    if (!results.wallet) {
      console.log('3. Setup identities:');
      console.log('   node enrollAdmin.js');
      console.log('   node registerUser.js\n');
    }
    
    if (!results.gateway || !results.discovery) {
      console.log('4. Check connection profile:');
      console.log('   • Verify paths in connection-org1.json');
      console.log('   • Ensure peer and orderer addresses are correct');
      console.log('   • Check TLS certificates exist\n');
    }
    
    return false;
  }
}

// Execute if run directly
if (require.main === module) {
  runHealthCheck()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runHealthCheck, results };
