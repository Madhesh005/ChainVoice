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
    
    console.log('Invoking GetAllInvoices...');
    const result = await contract.evaluateTransaction('GetAllInvoices');
    console.log('Raw result buffer:', result);
    console.log('Result toString():', result.toString());
    console.log('Result length:', result.length);
    
    if (result.length === 0 || result.toString() === '') {
      console.log('Empty result - chaincode returned nothing');
    } else {
      const parsed = JSON.parse(result.toString());
      console.log('Parsed result:', parsed);
    }
    
    gateway.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();
