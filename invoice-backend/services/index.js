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
  console.log('🔗 Using Hyperledger Fabric ledger');
  try {
    const FabricLedger = require('../fabricLedger');
    ledgerImplementation = new FabricLedger({
      channelName: process.env.FABRIC_CHANNEL || 'mychannel',
      chaincodeName: process.env.FABRIC_CHAINCODE || 'invoicecc',
      userId: process.env.FABRIC_USER || 'appUser',
      orgMSP: process.env.FABRIC_ORG_MSP || 'Org1MSP'
    });
  } catch (error) {
    console.error('❌ Failed to load Fabric modules:', error.message);
    console.log('💡 Install Fabric dependencies: npm install fabric-network fabric-ca-client');
    console.log('🔄 Falling back to PostgreSQL ledger');
    ledgerImplementation = new PostgresLedger();
  }
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