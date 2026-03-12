/**
 * Diagnose Fabric Network Setup
 * Checks all components and provides actionable feedback
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Fabric Network Diagnostic Tool\n');
console.log('='.repeat(50));

let issues = [];
let warnings = [];

// Check 1: Docker running
console.log('\n1️⃣  Checking Docker...');
try {
  execSync('docker --version', { stdio: 'pipe' });
  console.log('   ✓ Docker is installed');
  
  const containers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
  const containerList = containers.trim().split('\n').filter(c => c);
  
  const requiredContainers = [
    'peer0.org1.example.com',
    'peer0.org2.example.com',
    'orderer.example.com',
    'ca_org1',
    'ca_org2'
  ];
  
  console.log(`   ✓ Found ${containerList.length} running containers`);
  
  const missingContainers = requiredContainers.filter(c => 
    !containerList.some(running => running.includes(c))
  );
  
  if (missingContainers.length > 0) {
    warnings.push(`Missing containers: ${missingContainers.join(', ')}`);
    console.log(`   ⚠️  Missing: ${missingContainers.join(', ')}`);
  } else {
    console.log('   ✓ All required containers running');
  }
  
  // Check for chaincode container
  const chaincodeContainer = containerList.find(c => c.includes('invoicecc'));
  if (chaincodeContainer) {
    console.log(`   ✓ Chaincode container: ${chaincodeContainer.substring(0, 50)}...`);
  } else {
    warnings.push('Chaincode container not found');
    console.log('   ⚠️  Chaincode container not found');
  }
  
} catch (error) {
  issues.push('Docker not running or not installed');
  console.log('   ❌ Docker not available');
}

// Check 2: Connection profile
console.log('\n2️⃣  Checking connection profile...');
const ccpPath = path.join(__dirname, 'connection-org1.json');
if (fs.existsSync(ccpPath)) {
  console.log('   ✓ connection-org1.json exists');
  try {
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    if (ccp.peers && ccp.peers['peer0.org1.example.com']) {
      console.log('   ✓ Connection profile is valid');
    } else {
      issues.push('Connection profile is malformed');
      console.log('   ❌ Connection profile is malformed');
    }
  } catch (error) {
    issues.push('Connection profile is not valid JSON');
    console.log('   ❌ Invalid JSON in connection profile');
  }
} else {
  issues.push('connection-org1.json not found');
  console.log('   ❌ connection-org1.json not found');
  console.log('      Run: node generateConnectionProfile.js');
}

// Check 3: Wallet
console.log('\n3️⃣  Checking wallet...');
const walletPath = path.join(__dirname, 'wallet');
if (fs.existsSync(walletPath)) {
  console.log('   ✓ Wallet directory exists');
  
  const adminPath = path.join(walletPath, 'admin.id');
  const appUserPath = path.join(walletPath, 'appUser.id');
  const appUser2Path = path.join(walletPath, 'appUser2.id');
  
  if (fs.existsSync(adminPath)) {
    console.log('   ✓ Admin identity exists');
  } else {
    issues.push('Admin identity not found in wallet');
    console.log('   ❌ Admin identity not found');
  }
  
  // Check for configured user from .env
  const envPath = path.join(__dirname, '.env');
  let configuredUser = 'appUser';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/FABRIC_USER=(\w+)/);
    if (match) {
      configuredUser = match[1];
    }
  }
  
  const configuredUserPath = path.join(walletPath, `${configuredUser}.id`);
  if (fs.existsSync(configuredUserPath)) {
    console.log(`   ✓ ${configuredUser} identity exists (configured user)`);
  } else {
    issues.push(`${configuredUser} identity not found in wallet`);
    console.log(`   ❌ ${configuredUser} identity not found`);
    console.log(`      Run: node enroll-appuser2.js`);
  }
  
  // Show all available identities
  const identities = fs.readdirSync(walletPath).filter(f => f.endsWith('.id'));
  if (identities.length > 0) {
    console.log(`   📋 Available identities: ${identities.map(i => i.replace('.id', '')).join(', ')}`);
  }
} else {
  issues.push('Wallet directory not found');
  console.log('   ❌ Wallet directory not found');
  console.log('      Run: node enrollUser.js');
}

// Check 4: Chaincode
console.log('\n4️⃣  Checking chaincode...');
const chaincodePath = path.join(__dirname, 'chaincode', 'invoice.go');
if (fs.existsSync(chaincodePath)) {
  console.log('   ✓ Chaincode source exists');
  
  const chaincodeContent = fs.readFileSync(chaincodePath, 'utf8');
  if (chaincodeContent.includes('RegisterInvoice') && 
      chaincodeContent.includes('bindingHash')) {
    console.log('   ✓ Chaincode includes Layer-3 fields');
  } else {
    warnings.push('Chaincode may be outdated');
    console.log('   ⚠️  Chaincode may be missing Layer-3 fields');
  }
} else {
  issues.push('Chaincode source not found');
  console.log('   ❌ Chaincode source not found at chaincode/invoice.go');
}

// Check 5: Dependencies
console.log('\n5️⃣  Checking Node.js dependencies...');
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = ['fabric-network', 'fabric-ca-client'];
  
  const missingDeps = requiredDeps.filter(dep => !pkg.dependencies[dep]);
  if (missingDeps.length > 0) {
    issues.push(`Missing dependencies: ${missingDeps.join(', ')}`);
    console.log(`   ❌ Missing: ${missingDeps.join(', ')}`);
    console.log('      Run: npm install');
  } else {
    console.log('   ✓ All required dependencies installed');
  }
} else {
  issues.push('package.json not found');
  console.log('   ❌ package.json not found');
}

// Check 6: Environment variables
console.log('\n6️⃣  Checking environment configuration...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✓ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  if (envContent.includes('LEDGER_TYPE=fabric') || envContent.includes('USE_FABRIC=true')) {
    console.log('   ✓ Fabric ledger enabled');
  } else {
    warnings.push('Fabric ledger not enabled in .env');
    console.log('   ⚠️  Fabric ledger not enabled');
    console.log('      Set: LEDGER_TYPE=fabric or USE_FABRIC=true');
  }
} else {
  warnings.push('.env file not found');
  console.log('   ⚠️  .env file not found');
}

// Check 7: fabric-samples location
console.log('\n7️⃣  Checking fabric-samples...');
const fabricSamplesPath = path.join(__dirname, '..', 'fabric-samples');
if (fs.existsSync(fabricSamplesPath)) {
  console.log('   ✓ fabric-samples found');
  
  const testNetworkPath = path.join(fabricSamplesPath, 'test-network');
  if (fs.existsSync(testNetworkPath)) {
    console.log('   ✓ test-network directory exists');
  } else {
    issues.push('test-network directory not found');
    console.log('   ❌ test-network directory not found');
  }
} else {
  issues.push('fabric-samples not found');
  console.log('   ❌ fabric-samples not found');
  console.log('      Clone: git clone https://github.com/hyperledger/fabric-samples.git');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 DIAGNOSTIC SUMMARY\n');

if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! Your Fabric setup is ready.');
  console.log('\nNext steps:');
  console.log('1. Start server: node server.js');
  console.log('2. Test endpoint: curl http://localhost:3000/test-db');
} else {
  if (issues.length > 0) {
    console.log('❌ CRITICAL ISSUES:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
    console.log();
  }
  
  console.log('🔧 RECOMMENDED ACTIONS:\n');
  
  if (issues.some(i => i.includes('container'))) {
    console.log('1. Restart Fabric network:');
    console.log('   cd ../fabric-samples/test-network');
    console.log('   ./network.sh down');
    console.log('   ./network.sh up createChannel');
    console.log('   ./network.sh deployCC -ccn invoicecc -ccp ../../invoice-backend/chaincode -ccl go');
    console.log();
  }
  
  if (issues.some(i => i.includes('connection profile'))) {
    console.log('2. Generate connection profile:');
    console.log('   node generateConnectionProfile.js');
    console.log();
  }
  
  if (issues.some(i => i.includes('wallet') || i.includes('identity'))) {
    console.log('3. Enroll users:');
    console.log('   node enrollUser.js');
    console.log();
  }
  
  if (issues.some(i => i.includes('dependencies'))) {
    console.log('4. Install dependencies:');
    console.log('   npm install');
    console.log();
  }
  
  console.log('Or run the automated setup:');
  console.log('   setup-fabric-fresh.bat (Windows)');
}

console.log('\n' + '='.repeat(50));
