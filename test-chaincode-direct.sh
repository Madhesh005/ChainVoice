#!/bin/bash
cd fabric-samples/test-network
export PATH=$PATH:$PWD/../bin
export FABRIC_CFG_PATH=$PWD/../config/
source scripts/envVar.sh
setGlobals 1

echo "Testing GetAllInvoices..."
peer chaincode query -C mychannel -n invoicecc -c '{"Args":["GetAllInvoices"]}'

echo "Testing QueryInvoice with dummy hash..."
peer chaincode query -C mychannel -n invoicecc -c '{"Args":["QueryInvoice","dummy-hash"]}'