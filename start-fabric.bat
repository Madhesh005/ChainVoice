@echo off
REM Start Fabric Network and Deploy Chaincode (Windows)
REM Usage: start-fabric.bat

echo Starting Hyperledger Fabric Network...
echo.

cd fabric-network

echo 1. Starting network and creating channel...
call network.sh up createChannel -c mychannel

if %ERRORLEVEL% NEQ 0 (
    echo Failed to start network
    exit /b 1
)

echo.
echo 2. Deploying chaincode...
call network.sh deployCC -ccn invoicecc -ccp ../chaincode -ccl go

if %ERRORLEVEL% NEQ 0 (
    echo Failed to deploy chaincode
    exit /b 1
)

echo.
echo Fabric network is ready!
echo.
echo Next steps:
echo   1. Enroll users: cd backend ^&^& node enrollAppUser.js
echo   2. Start backend: cd backend ^&^& node server.js
echo.

cd ..
