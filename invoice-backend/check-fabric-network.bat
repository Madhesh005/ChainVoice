@echo off
echo ========================================
echo Fabric Network Status Check
echo ========================================
echo.

echo Checking Docker containers...
docker ps --format "table {{.Names}}\t{{.Status}}" | findstr "hyperledger\|couchdb\|ca_"

echo.
echo ========================================
echo Container Count:
echo ========================================
for /f %%i in ('docker ps ^| findstr "hyperledger" ^| find /c /v ""') do set PEER_COUNT=%%i
echo Hyperledger containers: %PEER_COUNT%
echo Expected: 5 (2 peers + 1 orderer + 2 CAs)

echo.
echo ========================================
echo Port Check:
echo ========================================
netstat -ano | findstr "7051 9051 7050 7054 8054" | findstr "LISTENING"

echo.
echo ========================================
echo Instructions:
echo ========================================
echo.
echo If you see containers above, network is running!
echo.
echo If NOT, you need to:
echo 1. Open Git Bash
echo 2. cd ../fabric-samples/test-network
echo 3. ./network.sh up createChannel -ca
echo.
echo Then run this script again to verify.
echo.
pause
