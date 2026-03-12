@echo off
echo ========================================
echo STEP 1: Stopping registry container
echo ========================================
docker stop invoice_registry_db
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo STEP 2: Removing registry container
echo ========================================
docker rm invoice_registry_db
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo STEP 3: Removing registry volume
echo ========================================
docker volume rm invoice-backend_registry_data 2>nul
docker volume rm registry_data 2>nul
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo STEP 4: Starting fresh registry database
echo ========================================
docker-compose up -d registry_db
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo STEP 5: Waiting for database to initialize
echo ========================================
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo STEP 6: Verifying user exists
echo ========================================
docker exec invoice_registry_db psql -U registry_user -d registry -c "\du"

echo.
echo ========================================
echo STEP 7: Testing connection from host
echo ========================================
set PGPASSWORD=registry_pass
psql -h localhost -p 5433 -U registry_user -d registry -c "SELECT 'Connection successful!' as status;"

echo.
echo ========================================
echo STEP 8: Creating invoice_registry table
echo ========================================
docker exec invoice_registry_db psql -U registry_user -d registry -c "CREATE TABLE IF NOT EXISTS invoice_registry (id SERIAL PRIMARY KEY, invoice_hash TEXT UNIQUE NOT NULL, financed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);"

echo.
echo ========================================
echo STEP 9: Verifying table creation
echo ========================================
docker exec invoice_registry_db psql -U registry_user -d registry -c "\dt"

echo.
echo ========================================
echo COMPLETE! Testing Node.js connection...
echo ========================================
node test-db.js

echo.
echo ========================================
echo All steps completed!
echo ========================================
pause
