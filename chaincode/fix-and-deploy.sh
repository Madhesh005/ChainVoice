#!/bin/bash

# ChainVoice Chaincode Fix and Deploy Script
# This script properly cleans and redeploys the chaincode

set -e

echo "============================================"
echo "🔧 ChainVoice Chaincode Fix & Deploy"
echo "============================================"
echo ""

# Step 1: Clean up old chaincode package
echo "1️⃣  Cleaning up old chaincode packages..."
cd /mnt/d/NxtGen/fabric-samples/test-network
rm -f invoicecc.tar.gz
echo "   ✅ Old packages removed"
echo ""

# Step 2: Ensure Go dependencies are clean
echo "2️⃣  Cleaning Go dependencies..."
cd /mnt/d/NxtGen/chaincode
go clean -modcache 2>/dev/null || true
go mod tidy
echo "   ✅ Go dependencies cleaned"
echo ""

# Step 3: Remove vendor directory and recreate
echo "3️⃣  Refreshing vendor directory..."
rm -rf vendor
go mod vendor
echo "   ✅ Vendor directory refreshed"
echo ""

# Step 4: Verify chaincode compiles locally
echo "4️⃣  Verifying chaincode compiles..."
go build -o /tmp/test-invoice-chaincode . 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Chaincode compiles successfully"
    rm -f /tmp/test-invoice-chaincode
else
    echo "   ❌ Chaincode compilation failed"
    exit 1
fi
echo ""

# Step 5: Deploy chaincode with new version
echo "5️⃣  Deploying chaincode..."
cd /mnt/d/NxtGen/fabric-samples/test-network

# Generate random version to force new package
NEW_VERSION="1.0.$(date +%s)"
echo "   Using version: $NEW_VERSION"

./network.sh deployCC \
    -c mychannel \
    -ccn invoicecc \
    -ccp /mnt/d/NxtGen/chaincode \
    -ccl go \
    -ccv "$NEW_VERSION"

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "✅ SUCCESS! Chaincode deployed"
    echo "============================================"
    echo ""
    echo "📋 Deployment Details:"
    echo "   Channel: mychannel"
    echo "   Chaincode: invoicecc"
    echo "   Version: $NEW_VERSION"
    echo "   Language: Go"
    echo ""
    echo "🚀 Next Steps:"
    echo "   1. Start backend: cd /mnt/d/NxtGen/invoice-backend && npm start"
    echo "   2. Test invoice registration"
    echo ""
else
    echo ""
    echo "============================================"
    echo "❌ DEPLOYMENT FAILED"
    echo "============================================"
    echo ""
    echo "Check the error messages above for details"
    exit 1
fi
