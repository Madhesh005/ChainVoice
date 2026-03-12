@echo off
echo ========================================
echo Fabric Network Fresh Setup
echo ========================================
echo.

echo Step 1: Stopping existing network and cleaning volumes...
cd ..\fabric-samples\test-network
call network.sh down
docker volume rm compose_orderer.example.com compose_peer0.org1.example.com compose_peer0.org2.example.com 2>nul
echo.

echo Step 2: Starting fresh network...
call network.sh up
if %errorlevel% neq 0 (
    echo ERROR: Failed to start network
    exit /b 1
)
echo.

echo Step 3: Creating channel...
call network.sh createChannel -c mychannel
if %errorlevel% neq 0 (
    echo ERROR: Failed to create channel
    exit /b 1
)
echo.

echo Step 4: Deploying chaincode...
call network.sh deployCC -ccn invoicecc -ccp ..\..\invoice-backend\chaincode -ccl go
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy chaincode
    exit /b 1
)
echo.

echo Step 5: Returning to invoice-backend...
cd ..\..\invoice-backend
echo.

echo Step 6: Cleaning old wallet...
if exist wallet (
    rmdir /s /q wallet
    echo Wallet cleaned
)
echo.

echo Step 7: Generating connection profile...
node generateConnectionProfile.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate connection profile
    exit /b 1
)
echo.

echo Step 8: Enrolling users...
node enrollUser.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to enroll users
    exit /b 1
)
echo.

echo ========================================
echo SUCCESS! Fabric network is ready
echo ========================================
echo.
echo Next steps:
echo 1. Start server: node server.js
echo 2. Test: curl http://localhost:3000/test-db
echo.
