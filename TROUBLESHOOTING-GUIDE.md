# Troubleshooting Guide - MSME Authentication & ERP Connection

## Issue 1: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

### Problem
This error occurs when the frontend tries to parse HTML as JSON. This typically happens when:
1. The backend server is not running
2. The API endpoint doesn't exist
3. CORS is blocking the request
4. The backend is returning an HTML error page instead of JSON

### Solution

#### Step 1: Verify Backend is Running
```bash
cd invoice-backend
npm start
```

Expected output:
```
Server running on port 3000
Database connected
```

#### Step 2: Check Backend URL Configuration
Create or update `client/.env`:
```
VITE_API_URL=http://localhost:3000
```

#### Step 3: Test Backend API Directly
```bash
# Test if backend is responding
curl http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin@123"}'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

#### Step 4: Check CORS Configuration
In `invoice-backend/server.js`, ensure CORS is enabled:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));
```

#### Step 5: Clear Browser Cache
1. Open DevTools (F12)
2. Go to Network tab
3. Check "Disable cache"
4. Reload page (Ctrl+Shift+R)

---

## Issue 2: ERP Connection Shows Mock Data / Already Connected

### Problem
The ERP Connection page shows "Already Connected" even though you haven't connected yet.

### Root Cause
The backend is returning existing connections from the database.

### Solution

#### Option A: Delete Existing Connections (Recommended for Testing)
```sql
-- Connect to PostgreSQL
psql -U postgres -d invoice_registry

-- Check existing connections
SELECT * FROM erp_connections;

-- Delete all connections for testing
DELETE FROM erp_connections;

-- Or delete for specific MSME
DELETE FROM erp_connections WHERE msme_id = 'YOUR_MSME_ID';
```

#### Option B: Add "Disconnect" Feature
Update `client/src/pages/msme/ERPConnection.tsx` to add a disconnect button.

---

## Issue 3: Cannot Connect to Real ERP

### Problem
When trying to connect to Odoo ERP, the connection fails.

### Checklist

#### 1. Verify Odoo is Running
```bash
# Check if Odoo is accessible
curl http://localhost:8069/web/database/selector
```

#### 2. Verify Odoo Credentials
- URL: `http://localhost:8069`
- Database: Check your Odoo database name
- Username: Usually `admin`
- Password: Your Odoo admin password

#### 3. Check Odoo XML-RPC is Enabled
Odoo must have XML-RPC enabled (default).

#### 4. Test Connection Manually
```bash
# Test Odoo authentication
curl -X POST http://localhost:8069/xmlrpc/2/common \
  -H "Content-Type: text/xml" \
  -d '<?xml version="1.0"?>
<methodCall>
  <methodName>authenticate</methodName>
  <params>
    <param><value><string>YOUR_DATABASE</string></value></param>
    <param><value><string>admin</string></value></param>
    <param><value><string>YOUR_PASSWORD</string></value></param>
    <param><value><struct></struct></value></param>
  </params>
</methodCall>'
```

#### 5. Check Backend Logs
```bash
cd invoice-backend
npm start

# Watch for connection attempts
# Look for: "🔌 Connecting to odoo ERP for MSME: ..."
```

---

## Issue 4: Dashboard Not Loading Data

### Problem
Dashboard shows loading spinner forever or displays error.

### Solution

#### 1. Check if User is Logged In
```javascript
// Open browser console (F12)
localStorage.getItem('token')
// Should return a JWT token string
```

#### 2. Check if Token is Valid
```bash
# Test dashboard API with token
curl http://localhost:3000/api/msme/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 3. Check Database Has Data
```sql
-- Connect to PostgreSQL
psql -U postgres -d invoice_registry

-- Check if MSME user exists
SELECT * FROM msme_users;

-- Check if invoices exist
SELECT * FROM invoices;
```

#### 4. Check Backend Logs
Look for errors in the backend console when dashboard loads.

---

## Issue 5: Login Fails

### Problem
Login returns error or doesn't work.

### Solution

#### 1. Verify User Exists
```sql
-- Connect to PostgreSQL
psql -U postgres -d invoice_registry

-- Check MSME users
SELECT id, email, company_name FROM msme_users;

-- Check admin user
SELECT * FROM regulator_admin;
```

#### 2. Reset Admin Password
```bash
cd invoice-backend
node setup-auth.js
```

This will recreate the admin user with password `admin@123`.

#### 3. Register New MSME User
Go to `/auth/register` and create a new account.

---

## Issue 6: CORS Errors

### Problem
Browser console shows CORS errors:
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://localhost:5173' has been blocked by CORS policy
```

### Solution

#### Install CORS Package
```bash
cd invoice-backend
npm install cors
```

#### Update server.js
```javascript
const cors = require('cors');

// Add before routes
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Issue 7: Database Connection Fails

### Problem
Backend shows "Database connection failed" error.

### Solution

#### 1. Check PostgreSQL is Running
```bash
# Windows
services.msc
# Look for PostgreSQL service

# Linux/Mac
sudo systemctl status postgresql
```

#### 2. Verify Database Credentials
Check `invoice-backend/.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_registry
DB_USER=postgres
DB_PASSWORD=your_password
```

#### 3. Create Database if Missing
```bash
psql -U postgres
CREATE DATABASE invoice_registry;
\q
```

#### 4. Run Migrations
```bash
cd invoice-backend
node setup-auth.js
```

---

## Quick Diagnostic Commands

### Check All Services
```bash
# 1. Check PostgreSQL
psql -U postgres -c "SELECT version();"

# 2. Check Backend
curl http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin@123"}'

# 3. Check Frontend
curl http://localhost:5173

# 4. Check Odoo (if using)
curl http://localhost:8069/web/database/selector
```

### Check Database Tables
```sql
psql -U postgres -d invoice_registry

-- List all tables
\dt

-- Check if auth tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('msme_users', 'lender_users', 'regulator_admin');

-- Check if ERP tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('erp_connections', 'invoices');
```

---

## Common Error Messages

### "Authentication failed. Please login again."
- Token expired (24 hours)
- Token invalid
- Solution: Logout and login again

### "Failed to fetch dashboard data"
- Backend not running
- Database connection issue
- Solution: Check backend logs

### "ERP authentication failed"
- Wrong Odoo credentials
- Odoo not running
- Solution: Verify Odoo credentials

### "Failed to connect to ERP"
- Network issue
- Odoo XML-RPC not accessible
- Solution: Check Odoo is running and accessible

---

## Getting Help

### Enable Debug Mode

#### Backend
```javascript
// In invoice-backend/server.js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

#### Frontend
```typescript
// In client/src/utils/api.ts
console.log('API Request:', endpoint, options);
console.log('API Response:', data);
```

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors (red text)
4. Check Network tab for failed requests

### Check Backend Logs
Watch the terminal where `npm start` is running for error messages.

---

## Reset Everything (Nuclear Option)

If nothing works, reset everything:

```bash
# 1. Stop all services
# Press Ctrl+C in all terminals

# 2. Drop and recreate database
psql -U postgres
DROP DATABASE invoice_registry;
CREATE DATABASE invoice_registry;
\q

# 3. Reinstall backend dependencies
cd invoice-backend
rm -rf node_modules package-lock.json
npm install

# 4. Setup database
node setup-auth.js

# 5. Reinstall frontend dependencies
cd ../client
rm -rf node_modules package-lock.json
npm install

# 6. Clear browser data
# In browser: Ctrl+Shift+Delete
# Clear cache and cookies

# 7. Restart everything
cd ../invoice-backend
npm start

# In new terminal
cd ../client
npm run dev
```

---

## Success Checklist

✅ PostgreSQL running
✅ Backend running on port 3000
✅ Frontend running on port 5173
✅ Can login with admin@gmail.com / admin@123
✅ Dashboard loads without errors
✅ ERP Connection page loads
✅ Can connect to Odoo (if available)
✅ Invoices page loads
✅ No CORS errors in console
✅ No authentication errors

---

**Last Updated:** March 8, 2026
