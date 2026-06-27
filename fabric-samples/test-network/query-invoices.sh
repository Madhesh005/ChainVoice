#!/bin/bash
#
# Query Hyperledger Fabric Chaincode - Get All Invoices
# This script queries the invoicecc chaincode to see what invoices are stored on the blockchain
#

echo "=========================================="
echo "Querying Hyperledger Fabric Invoices"
echo "=========================================="
echo ""

# Set environment variables for Org1
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

echo "📋 Environment configured for Org1"
echo "   Channel: mychannel"
echo "   Chaincode: invoicecc"
echo "   Peer: localhost:7051"
echo ""

# Check if network is running
echo "🔍 Checking if Fabric network is running..."
if ! docker ps | grep -q "peer0.org1.example.com"; then
    echo "❌ Error: Fabric network is not running!"
    echo ""
    echo "Start the network first:"
    echo "   cd /mnt/d/NxtGen/fabric-samples/test-network"
    echo "   ./network.sh up createChannel -c mychannel -ca"
    echo "   ./network.sh deployCC -ccn invoicecc -ccp /mnt/d/NxtGen/chaincode -ccl go"
    exit 1
fi

echo "✓ Fabric network is running"
echo ""

# Query all invoices
echo "📊 Querying all invoices from blockchain..."
echo ""

peer chaincode query \
    -C mychannel \
    -n invoicecc \
    -c '{"Args":["GetAllInvoices"]}'

echo ""
echo "=========================================="
echo "✅ Query Complete!"
echo "=========================================="
echo ""
echo "📝 Available Chaincode Functions:"
echo "   - GetAllInvoices: Get all invoices"
echo "   - GetInvoiceByGIID: Get specific invoice by GIID"
echo "   - QueryInvoicesByMSME: Get invoices for specific MSME"
echo "   - GetInvoiceHistory: Get history of an invoice"
echo ""
echo "📖 Usage Examples:"
echo "   Query by GIID:"
echo "   peer chaincode query -C mychannel -n invoicecc -c '{\"Args\":[\"GetInvoiceByGIID\",\"YOUR_GIID\"]}'"
echo ""
echo "   Query by MSME:"
echo "   peer chaincode query -C mychannel -n invoicecc -c '{\"Args\":[\"QueryInvoicesByMSME\",\"YOUR_MSME_ID\"]}'"
echo ""
