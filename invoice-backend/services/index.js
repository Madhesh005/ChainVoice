/**
 * Services Index
 * Exports initialized services for use in controllers
 */

const { LedgerService } = require('../ledgerService');
const PostgresLedger = require('../postgresLedger');
const { IdentityEngine } = require('./identityEngine');
const { IPFSService } = require('./ipfsService');
const { VerificationEngine } = require('./verificationEngine');

// Determine which ledger implementation to use
const ledgerType = process.env.LEDGER_TYPE || 'postgres';
const useFabric = process.env.USE_FABRIC === 'true' || ledgerType === 'fabric';

let ledgerImplementation;
if (useFabric) {
  console.log('🔗 Using Hyperledger Fabric ledger (via blockchain module)');
  const FabricLedgerAdapter = require('../fabricLedgerAdapter');
  ledgerImplementation = new FabricLedgerAdapter({
    channelName: process.env.FABRIC_CHANNEL || 'mychannel',
    chaincodeName: process.env.FABRIC_CHAINCODE || 'invoicecc',
    userId: process.env.FABRIC_USER || 'appUser',
    orgMSP: process.env.FABRIC_ORG_MSP || 'Org1MSP'
  });
  console.log('   ✅ Using independent blockchain module at ../blockchain/');
  console.log('   ✅ Single Gateway connection (no duplicate Fabric clients)');
  console.log('   ✅ Wallet: blockchain/wallet/');
  console.log('   ✅ Connection Profile: blockchain/connection-org1.json');
} else {
  console.log('🗄️  Using PostgreSQL ledger');
  ledgerImplementation = new PostgresLedger();
}

// Initialize services
const ledgerService = new LedgerService(ledgerImplementation);
const identityEngine = new IdentityEngine(ledgerService);
const ipfsService = new IPFSService();
const verificationEngine = new VerificationEngine(ledgerService, ipfsService);

// Initialize ledger service
ledgerService.init()
  .then(() => {
    console.log('✅ Ledger service initialized successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize ledger service:', error);
  });

module.exports = {
  ledgerService,
  identityEngine,
  ipfsService,
  verificationEngine
};