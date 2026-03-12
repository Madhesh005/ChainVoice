# Quick Fix: Restart Backend Server

## The Problem
You're getting 404 errors because the backend server hasn't loaded the new lender routes yet.

## The Solution (3 Steps)

### Step 1: Stop Backend
In the terminal where your backend is running, press:
```
Ctrl + C
```

### Step 2: Restart Backend
```bash
cd invoice-backend
npm start
```

### Step 3: Refresh Browser
Go to your browser and refresh the lender dashboard page (F5 or Ctrl+R)

## That's It!

The dashboard should now load with real data (or empty states if no invoices are assigned yet).

## What to Expect

After restart, you should see:
- **Pending Verification**: 0 (or number of AVAILABLE invoices)
- **Active Financing**: ₹0 (or sum of LOCKED + FINANCED)
- **Portfolio Size**: 0 (or count of financed invoices)
- **Default Rate**: 0.00%

If no invoices are assigned to the lender, you'll see:
- "No invoices pending verification" message
- "No recent activity" message

This is normal! To test with data:
1. Login as MSME
2. Register an invoice on blockchain
3. Select lenders and request financing
4. Login as lender again
5. Dashboard will show the invoice

## Still Getting 404?

Make sure you're in the correct directory:
```bash
# Check current directory
pwd

# Should show something like: /path/to/NxtGen/invoice-backend

# If not, navigate to it:
cd invoice-backend
npm start
```
