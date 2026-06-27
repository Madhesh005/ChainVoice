const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const config = require('./config');

async function test() {
  try {
    const wallet = await Wallets.newFileSystemWallet(config.walletPath);
    const ccp = JSON.parse(fs.readFileSync(config.connectionProfilePath, 'utf8'));
    
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: config.appUser,
      discovery: { enabled: true, asLocalhost: true }
    });
    
    const network = await gateway.getNetwork(config.channelName);
    const contract = network.getContract(config.chaincodeName);
    
    console.log('Calling InitLedger...');
    await contract.submitTransaction('InitLedger');
    console.log('InitLedger called successfully');
    
    console.log('\nCalling GetAllInvoices...');
    const result = await contract.evaluateTransaction('GetAllInvoices');
    console.log('Result buffer length:', result.length);
    console.log('Result toString():', result.toString());
    
    gateway.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
