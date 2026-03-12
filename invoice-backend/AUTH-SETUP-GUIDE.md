# Authentication Setup Guide

## Overview

This guide explains how to set up and use the authentication system for the Invoice Registry backend.

## Features

- ✅ Three user roles: MSME, Lender/NBFC, and Regulator (Admin)
- ✅ Secure password hashing with bcrypt (12 salt rounds)
- ✅ JWT token-based authentication (24-hour expiration)
- ✅ Role-based access control
- ✅ Pre-configured admin account
- ✅ PostgreSQL database integration

---

## Installation

### 1. Install Dependencies

```bash
cd invoice-backend
npm install
```

This will install:
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation
- `uuid` - UUID generation

### 2. Configure Environment Variables

The `.env` file has been updated with:

```env
JWT_SECRET=invoice_registry_super_secret_key_change_in_production_2024
BCRYPT_ROUNDS=12
```

⚠️ **Important**: Change `JWT_SECRET` in production!

### 3. Setup Database

Run the setup script to create tables and admin user:

```bash
npm run setup-auth
```

This will:
- Create `msme_users` table
- Create `lender_users` table
- Create `regulator_admin` table
- Insert admin user with hashed password

---

## Database Schema

### msme_users Table

```sql
CREATE TABLE msme_users (
    id UUID PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    gstin VARCHAR(15) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### lender_users Table

```sql
CREATE TABLE lender_users (
    id UUID PRIMARY KEY,
    institution_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### regulator_admin Table

```sql
CREATE TABLE regulator_admin (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### 1. MSME Registration

**POST** `/api/auth/msme/register`

**Request:**
```json
{
  "company_name": "ABC Corporation",
  "contact_person": "John Doe",
  "email": "john@abccorp.com",
  "phone": "9876543210",
  "gstin": "27AAACT2727Q1ZV",
  "password": "securepass123"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "MSME registered successfully",
  "data": {
    "id": "uuid-here",
    "company_name": "ABC Corporation",
    "contact_person": "John Doe",
    "email": "john@abccorp.com",
    "phone": "9876543210",
    "gstin": "27AAACT2727Q1ZV",
    "created_at": "2024-03-08T10:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "REGISTRATION_FAILED",
  "message": "Email already registered"
}
```

---

### 2. MSME Login

**POST** `/api/auth/msme/login`

**Request:**
```json
{
  "email": "john@abccorp.com",
  "password": "securepass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "company_name": "ABC Corporation",
    "email": "john@abccorp.com",
    "role": "msme"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "AUTH_FAILED",
  "message": "Invalid email or password"
}
```

---

### 3. Lender Registration

**POST** `/api/auth/lender/register`

**Request:**
```json
{
  "institution_name": "HDFC Bank",
  "contact_person": "Jane Smith",
  "email": "jane@hdfc.com",
  "phone": "9876543211",
  "license_number": "RBI/NBFC/2024/001",
  "password": "securepass456"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Lender registered successfully",
  "data": {
    "id": "uuid-here",
    "institution_name": "HDFC Bank",
    "contact_person": "Jane Smith",
    "email": "jane@hdfc.com",
    "phone": "9876543211",
    "license_number": "RBI/NBFC/2024/001",
    "created_at": "2024-03-08T10:00:00.000Z"
  }
}
```

---

### 4. Lender Login

**POST** `/api/auth/lender/login`

**Request:**
```json
{
  "email": "jane@hdfc.com",
  "password": "securepass456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "institution_name": "HDFC Bank",
    "email": "jane@hdfc.com",
    "role": "lender"
  }
}
```

---

### 5. Admin Login

**POST** `/api/auth/admin/login`

**Request:**
```json
{
  "email": "admin@gmail.com",
  "password": "admin@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "admin@gmail.com",
    "role": "admin"
  }
}
```

⚠️ **Note**: Admin registration is not allowed. Only one admin account exists.

---

### 6. Verify Token

**GET** `/api/auth/verify`

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "success": true,
  "valid": true,
  "user": {
    "id": "uuid-here",
    "role": "msme",
    "company_name": "ABC Corporation",
    "email": "john@abccorp.com"
  }
}
```

---

## Using Authentication in Frontend

### 1. Login Flow

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/msme/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@abccorp.com',
    password: 'securepass123'
  })
});

const data = await response.json();

if (data.success) {
  // Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}
```

### 2. Making Authenticated Requests

```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/erp/invoices', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Verify Token on Page Load

```javascript
const token = localStorage.getItem('token');

if (token) {
  const response = await fetch('http://localhost:3000/api/auth/verify', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!data.success) {
    // Token invalid - redirect to login
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
```

---

## Protecting Backend Routes

### Using Middleware

```javascript
const { authenticate, requireMSME, requireLender, requireAdmin } = require('./middleware/authMiddleware');

// Protect route - any authenticated user
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// MSME only
app.get('/api/msme/dashboard', authenticate, requireMSME, (req, res) => {
  res.json({ message: 'MSME Dashboard' });
});

// Lender only
app.get('/api/lender/dashboard', authenticate, requireLender, (req, res) => {
  res.json({ message: 'Lender Dashboard' });
});

// Admin only
app.get('/api/admin/dashboard', authenticate, requireAdmin, (req, res) => {
  res.json({ message: 'Admin Dashboard' });
});
```

---

## Security Features

### Password Hashing
- ✅ Bcrypt with 12 salt rounds
- ✅ Passwords never stored in plaintext
- ✅ Secure comparison using `bcrypt.compare()`

### JWT Tokens
- ✅ 24-hour expiration
- ✅ Signed with secret key
- ✅ Contains user ID and role
- ✅ Verified on each request

### Input Validation
- ✅ Email uniqueness check
- ✅ Required field validation
- ✅ SQL injection prevention (parameterized queries)

### Error Handling
- ✅ Generic error messages (no password hints)
- ✅ Standardized error responses
- ✅ No sensitive data in errors

---

## Testing

### Test Admin Login

```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin@123"}'
```

### Test MSME Registration

```bash
curl -X POST http://localhost:3000/api/auth/msme/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Corp",
    "contact_person": "Test User",
    "email": "test@testcorp.com",
    "phone": "9876543210",
    "gstin": "27AAACT2727Q1ZV",
    "password": "testpass123"
  }'
```

### Test Token Verification

```bash
curl -X GET http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Troubleshooting

### "Email already registered"
- Email must be unique across each user type
- Check if user already exists in database

### "Invalid email or password"
- Verify credentials are correct
- Check if user exists in correct table (msme_users, lender_users, regulator_admin)

### "Invalid or expired token"
- Token expires after 24 hours
- User must login again
- Check JWT_SECRET matches between requests

### Database connection errors
- Verify DATABASE_URL in .env
- Ensure PostgreSQL is running
- Check database permissions

---

## File Structure

```
invoice-backend/
├── controllers/
│   └── authController.js       # HTTP request handlers
├── middleware/
│   └── authMiddleware.js       # JWT verification & role checks
├── migrations/
│   └── 001_create_auth_tables.sql  # Database schema
├── models/
│   └── userModels.js           # Database operations
├── routes/
│   └── authRoutes.js           # API route definitions
├── services/
│   └── authService.js          # Business logic
├── utils/
│   └── passwordUtil.js         # Password hashing utilities
├── setup-auth.js               # Database setup script
├── .env                        # Environment variables
└── server.js                   # Main server file
```

---

## Next Steps

1. ✅ Run `npm install` to install dependencies
2. ✅ Run `npm run setup-auth` to create tables
3. ✅ Start server with `npm start`
4. ✅ Test admin login
5. ✅ Integrate with frontend
6. ✅ Protect existing routes with authentication

---

## Production Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a strong random value
- [ ] Change admin password
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Add password strength requirements
- [ ] Add email verification
- [ ] Add password reset functionality
- [ ] Add account lockout after failed attempts
- [ ] Add audit logging
- [ ] Review CORS settings

---

## Support

For issues or questions:
1. Check this guide
2. Review error messages
3. Check server logs
4. Verify database connection
5. Test with curl/Postman first

---

**Authentication system is ready! 🎉**
