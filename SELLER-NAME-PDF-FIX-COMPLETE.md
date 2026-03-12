# Seller Name & PDF Download Fix - Complete Guide

## Issues Fixed

### 1. Seller Name Not Showing
The seller_name field was missing from the database schema and not being saved during ERP sync.

### 2. PDF Download Failing
The Odoo provider didn't have a downloadInvoicePDF method to fetch PDFs from Odoo.

## Changes Made

### Backend Changes

#### 1. Added seller_name Column to Database
**File**: `invoice-backend/migrations/add-seller-name-column.sql` (NEW)
- Adds `seller_name VARCHAR(500)` column to invoices table
- Updates existing invoices with seller name from raw_data

#### 2. Updated Invoice Model
**File**: `invoice-backend/models/invoice.model.js`
- Added `seller_name` to upsert method
- Includes seller_name in INSERT and UPDATE queries
- Added seller_name to values array

#### 3. Updated Odoo Provider
**File**: `invoice-backend/erp/providers/odooProvider.js`
- Extracts company name from `company_id` field
- Maps company name to `seller_name` in invoice data
- Added `downloadInvoicePDF()` method that uses DocumentService

#### 4. Added PDF Download Endpoint
**File**: `invoice-backend/controllers/erpController.js`
- Added `downloadInvoicePDF()` method
- Verifies invoice ownership
- Gets ERP connection and credentials
- Downloads PDF from Odoo via provider
- Returns PDF buffer with proper headers

#### 5. Added PDF Download Route
**File**: `invoice-backend/routes/erpRoutes.js`
- Added route: `GET /invoices/:id/pdf`

### Frontend Changes

#### 1. Added PDF Download API Function
**File**: `client/src/utils/api.ts`
- Added `downloadInvoicePDF()` function
- Fetches PDF as blob
- Handles authentication

#### 2. Updated Invoice Detail Page
**File**: `client/src/pages/msme/InvoiceDetail.tsx`
- Added `downloadingPDF` state
- Added `handleDownloadPDF()` function
- Updated Download PDF button with loading state
- Creates download link and triggers download

#### 3. Fixed Dashboard Activity Timeline
**File**: `client/src/pages/msme/Dashboard.tsx`
- Added default empty array for activities
- Added safety checks for undefined activities
- Fixed "Cannot read properties of undefined" error

## Setup Instructions

### Step 1: Run Database Migration
Add the seller_name column to the invoices table:

```bash
cd invoice-backend
psql postgresql://postgres:admin@localhost:5432/invoice_chain -f migrations/add-seller-name-column.sql
```

Or if using psql directly:
```bash
psql -U postgres -d invoice_chain -f migrations/add-seller-name-column.sql
```

### Step 2: Restart Backend Server
```bash
cd invoice-backend
npm start
```

### Step 3: Re-sync Invoices from ERP
To populate seller_name for existing invoices:
1. Login as MSME
2. Go to "My Invoices"
3. Click "Sync ERP" button
4. All invoices will be updated with seller names

### Step 4: Test PDF Download
1. Login as MSME
2. Go to "My Invoices"
3. Click on any invoice to view details
4. Click "Download PDF" button
5. PDF should download to your Downloads folder

## How It Works

### Seller Name Flow
1. During ERP sync, Odoo returns invoice with `company_id` field
2. `company_id` is an array: `[id, "Company Name"]`
3. `odooProvider.js` extracts: `companyName = company_id[1]`
4. Maps to `seller_name` field in invoice data
5. `invoice.model.js` saves seller_name to database
6. Frontend displays seller_name in invoice summary

### PDF Download Flow
1. User clicks "Download PDF" button
2. Frontend calls `downloadInvoicePDF(invoiceId)`
3. API calls `GET /api/erp/invoices/:id/pdf`
4. Backend:
   - Verifies invoice ownership
   - Gets ERP connection (Odoo credentials)
   - Creates Odoo provider instance
   - Calls `provider.downloadInvoicePDF(erpInvoiceId)`
   - Provider uses DocumentService to:
     - Authenticate with Odoo (session-based)
     - Download PDF from `/report/pdf/account.report_invoice/{id}`
     - Validate PDF signature (%PDF-)
     - Return PDF buffer
5. Backend sends PDF with headers:
   - Content-Type: application/pdf
   - Content-Disposition: attachment; filename="invoice_XXX.pdf"
6. Frontend receives blob
7. Creates temporary download link
8. Triggers download
9. Cleans up temporary link

## Troubleshooting

### Seller Name Still Not Showing
1. Check if migration ran successfully:
```sql
\d invoices
-- Should show seller_name column
```

2. Check if seller_name is populated:
```sql
SELECT id, invoice_number, seller_name FROM invoices LIMIT 5;
```

3. If empty, re-sync invoices from ERP

### PDF Download Still Failing
1. Check backend logs for errors
2. Verify Odoo is running and accessible
3. Check ERP connection credentials
4. Test Odoo authentication:
```bash
cd invoice-backend
node test-odoo-auth.js
```

5. Check if invoice exists in Odoo:
   - Login to Odoo
   - Go to Accounting > Customers > Invoices
   - Find the invoice by number

### Common Errors

**Error**: "Failed to download invoice PDF"
- **Cause**: Odoo authentication failed or invoice doesn't exist
- **Solution**: Check Odoo credentials and invoice ID

**Error**: "Cannot read properties of undefined (reading 'length')"
- **Cause**: activities array is undefined
- **Solution**: Already fixed in Dashboard.tsx with default empty array

**Error**: "seller_name column does not exist"
- **Cause**: Migration not run
- **Solution**: Run add-seller-name-column.sql migration

## Files Modified Summary

### Backend (7 files)
1. `invoice-backend/migrations/add-seller-name-column.sql` (NEW)
2. `invoice-backend/models/invoice.model.js`
3. `invoice-backend/erp/providers/odooProvider.js`
4. `invoice-backend/controllers/erpController.js`
5. `invoice-backend/routes/erpRoutes.js`

### Frontend (3 files)
1. `client/src/utils/api.ts`
2. `client/src/pages/msme/InvoiceDetail.tsx`
3. `client/src/pages/msme/Dashboard.tsx`

## Testing Checklist

- [ ] Run seller_name migration
- [ ] Restart backend server
- [ ] Dashboard loads without errors
- [ ] Re-sync invoices from ERP
- [ ] Seller name appears in invoice details
- [ ] Download PDF button works
- [ ] PDF downloads with correct filename
- [ ] PDF opens correctly
- [ ] Loading spinner shows during download
- [ ] Error messages display if download fails

## Status
✅ All fixes implemented
⚠️ Requires database migration before testing
