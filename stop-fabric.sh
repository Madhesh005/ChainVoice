#!/bin/bash
#
# Stop Fabric Network
# Usage: ./stop-fabric.sh
#

set -e

echo "🛑 Stopping Hyperledger Fabric Network..."
echo ""

cd fabric-network
./network.sh down

echo ""
echo "✅ Fabric network stopped"
echo ""
