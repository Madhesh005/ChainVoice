@echo off
echo ========================================
echo Fabric Network Clean Setup
echo ========================================
echo.
echo This will completely reset the Fabric network
echo including CA database and all identities.
echo.
pause

echo Step 1: Stopping network...
cd ..\fabric-samples\test-network
call network.sh down
if %errorlevel% neq 0 (
    echo WARNING: network.sh down had issues, continuing...
)
echo.

echo Step 2: Cleaning Docker volumes...
docker volume prune -f
echo.

echo Step 3: Starting fresh network...
call network.sh up
if %errorlevel% neq 0 (
    echo ERROR: Failed to start network
    exit /b 1
)
echo.

echo Step 4: Creating channel...
call network.sh createChannel -c mychannel
if %errorlevel% neq 0 (
    echo ERROR: Failed to create channel
    exit /b 1
)
echo.

echo Step 5: Deploying chaincode...
call network.sh deployCC -ccn invoicecc -ccp ..\..\invoice-backend\chaincode -ccl go
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy chaincode
    exit /b 1
)
echo.

echo Step 6: Returning to invoice-backend...
cd ..\..\invoice-backend
echo.

echo Step 7: Cleaning old wallet...
if exist wallet (
    rmdir /s /q wallet
    echo Wallet cleaned
)
echo.

echo Step 8: Generating connection profile...
node generateConnectionProfile.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to generate connection profile
    exit /b 1
)
echo.

echo Step 9: Enrolling users...
node enrollUser.js
if %errorlevel% neq 0 (
    echo ERROR: Failed to enroll users
    exit /b 1
)
echo.

echo Step 10: Running diagnostic...
node diagnose-fabric.js
echo.

echo ========================================
echo SUCCESS! Fabric network is ready
echo ========================================
echo.
echo Next steps:
echo 1. Start server: node server.js
echo 2. Test: curl http://localhost:3000/test-db
echo 3. Register invoice: curl -X POST http://localhost:3000/invoice/42
echo.
