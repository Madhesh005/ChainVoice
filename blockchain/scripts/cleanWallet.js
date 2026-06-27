/**
 * Clean Wallet Script
 * 
 * Removes all identities from the wallet.
 * Useful when you need to start fresh or after network restart.
 * 
 * Usage: node scripts/cleanWallet.js
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

async function cleanWallet() {
  try {
    console.log('\n🧹 Cleaning Wallet');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const walletPath = config.walletPath;
    
    if (!fs.existsSync(walletPath)) {
      console.log('⚠️  Wallet directory does not exist');
      console.log(`   Path: ${walletPath}`);
      console.log('\n✅ Nothing to clean\n');
      return;
    }
    
    console.log(`📂 Wallet location: ${walletPath}\n`);
    
    // List current identities
    const files = fs.readdirSync(walletPath);
    const identities = files.filter(f => !f.startsWith('.'));
    
    if (identities.length === 0) {
      console.log('⚠️  Wallet is already empty');
      console.log('\n✅ Nothing to clean\n');
      return;
    }
    
    console.log(`Found ${identities.length} identities:`);
    identities.forEach(id => console.log(`   • ${id}`));
    console.log('');
    
    // Remove wallet directory
    console.log('🗑️  Removing wallet directory...');
    fs.rmSync(walletPath, { recursive: true, force: true });
    console.log('✅ Wallet directory removed\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Wallet cleaned successfully!\n');
    console.log('Next steps:');
    console.log('   1. node enrollAdmin.js');
    console.log('   2. node registerUser.js\n');
    
  } catch (error) {
    console.error('\n❌ Failed to clean wallet:');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanWallet()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { cleanWallet };
