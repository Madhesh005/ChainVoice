@echo off
REM Stop Fabric Network (Windows)
REM Usage: stop-fabric.bat

echo Stopping Hyperledger Fabric Network...
echo.

cd fabric-network
call network.sh down

echo.
echo Fabric network stopped
echo.

cd ..
