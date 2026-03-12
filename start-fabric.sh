#!/bin/bash
#
# Start Fabric Network and Deploy Chaincode
# Usage: ./start-fabric.sh
#

set -e

echo "🚀 Starting Hyperledger Fabric Network..."
echo ""

# Navigate to fabric-network
cd fabric-network

# Start network and create channel
echo "1️⃣  Starting network and creating channel..."
./network.sh up createChannel -c mychannel

if [ $? -ne 0 ]; then
    echo "❌ Failed to start network"
    exit 1
fi

echo ""
echo "2️⃣  Deploying chaincode..."
./network.sh deployCC -ccn invoicecc -ccp ../chaincode -ccl go

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy chaincode"
    exit 1
fi

echo ""
echo "✅ Fabric network is ready!"
echo ""
echo "Next steps:"
echo "  1. Enroll users: cd backend && node enrollAppUser.js"
echo "  2. Start backend: cd backend && node server.js"
echo ""
