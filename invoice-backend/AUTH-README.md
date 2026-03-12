# Authentication System - Quick Start

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
npm run setup-auth
```

### Step 3: Start Server
```bash
npm start
```

---

## ✅ What's Included

- **3 User Types**: MSME, Lender/NBFC, Regulator (Admin)
- **Secure Passwords**: Bcrypt hashing with 12 salt rounds
- **JWT Tokens**: 24-hour expiration
- **Role-Based Access**: Middleware for route protection
- **Pre-configured Admin**: email: `admin@gmail.com`, password: `admin@123`

---

## 📝 Default Admin Credentials

```
Email:    admin@gmail.com
Password: admin@123
```

⚠️ **Change this in production!**

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/msme/register` | Register MSME user |
| POST | `/api/auth/msme/login` | Login MSME user |
| POST | `/api/auth/lender/register` | Register Lender user |
| POST | `/api/auth/lender/login` | Login Lender user |
| POST | `/api/auth/admin/login` | Login Admin (no registration) |
| GET | `/api/auth/verify` | Verify JWT token |

---

## 🧪 Test the System

```bash
# Make sure server is running first
npm start

# In another terminal, run tests
node test-auth.js
```

---

## 📖 Full Documentation

See `AUTH-SETUP-GUIDE.md` for:
- Complete API documentation
- Frontend integration examples
- Security features
- Troubleshooting guide
- Production checklist

---

## 🔐 Example Usage

### Register MSME
```bash
curl -X POST http://localhost:3000/api/auth/msme/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "ABC Corp",
    "contact_person": "John Doe",
    "email": "john@abccorp.com",
    "phone": "9876543210",
    "gstin": "27AAACT2727Q1ZV",
    "password": "securepass123"
  }'
```

### Login Admin
```bash
curl -X POST http://localhost:3000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "admin@123"
  }'
```

---

## 🛡️ Security Features

✅ Passwords hashed with bcrypt (never stored in plaintext)
✅ JWT tokens with expiration
✅ Email uniqueness validation
✅ SQL injection prevention
✅ Role-based access control
✅ Standardized error responses

---

## 📁 File Structure

```
invoice-backend/
├── controllers/authController.js    # Request handlers
├── middleware/authMiddleware.js     # JWT & role verification
├── models/userModels.js             # Database operations
├── routes/authRoutes.js             # API routes
├── services/authService.js          # Business logic
├── utils/passwordUtil.js            # Password hashing
├── migrations/001_create_auth_tables.sql  # Database schema
├── setup-auth.js                    # Setup script
└── test-auth.js                     # Test script
```

---

## ⚡ Quick Commands

```bash
# Install dependencies
npm install

# Setup database tables and admin
npm run setup-auth

# Start server
npm start

# Test authentication
node test-auth.js
```

---

## 🔧 Environment Variables

Added to `.env`:
```env
JWT_SECRET=invoice_registry_super_secret_key_change_in_production_2024
BCRYPT_ROUNDS=12
```

---

## ✨ Integration with Existing Backend

✅ No changes to existing invoice/ERP/blockchain logic
✅ Auth routes added at `/api/auth/*`
✅ Middleware available for protecting routes
✅ Compatible with existing database
✅ CORS enabled for frontend

---

## 🎯 Next Steps

1. Run `npm run setup-auth` to create tables
2. Test admin login
3. Integrate with your frontend
4. Protect existing routes with auth middleware
5. Change admin password in production

---

## 💡 Frontend Integration

```javascript
// Login
const response = await fetch('http://localhost:3000/api/auth/msme/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await response.json();

// Store token
localStorage.setItem('token', token);

// Use token in requests
fetch('http://localhost:3000/api/erp/invoices', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 🆘 Troubleshooting

**Server won't start?**
- Check if port 3000 is available
- Verify DATABASE_URL in .env

**Setup script fails?**
- Ensure PostgreSQL is running
- Check database connection
- Verify database permissions

**Login fails?**
- Verify credentials are correct
- Check if user exists in database
- Ensure setup-auth was run

---

**Authentication system ready! 🎉**

For detailed documentation, see `AUTH-SETUP-GUIDE.md`
