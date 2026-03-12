const FabricLedger = require('./invoice-backend/fabricLedger');

async function testSimpleChaincode() {
    console.log('🔍 Testing simple chaincode...');
    
    try {
        const fabricLedger = new FabricLedger();
        await fabricLedger.init();
        
        console.log('✅ Fabric connection initialized');
        
        // Test the simple Test function
        console.log('🔍 Testing simple Test function...');
        const result = await fabricLedger.contract.evaluateTransaction('Test');
        console.log('✅ Test result:', result.toString());
        
        await fabricLedger.disconnect();
        console.log('✅ Test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

testSimpleChaincode();