#!/bin/bash
cd fabric-samples/test-network
export PATH=$PATH:$PWD/../bin
export FABRIC_CFG_PATH=$PWD/../config/
source scripts/envVar.sh
setGlobals 1

echo "Testing RegisterInvoice..."
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile $PWD/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem \
  -C mychannel \
  -n invoicecc \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles $PWD/organizations/peerOrganizations/org2.example.com/tlsca/tlsca.org2.example.com-cert.pem \
  -c '{"Args":["RegisterInvoice","test-hash-12345","TEST-INV-001","doc-hash-12345","binding-hash-12345","ipfs-cid-12345"]}'