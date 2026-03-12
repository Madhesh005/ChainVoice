# Request Financing - Setup Guide

## Quick Start

### 1. Run Database Migration

```bash
cd invoice-backend
node run-blockchain-migration.js
```

This adds the required blockchain fields to the `invoices` table.

### 2. Restart Backend Server

```bash
cd invoice-backend
node server.js
```

### 3. Restart Frontend

```bash
cd client
npm run dev
```

### 4. Test the Feature

1. Login as MSME user
2. Navigate to "My Invoices"
3. Click "View Details" on a posted invoice
4. Click "Request Financing" button
5. Wait for blockchain registration to complete
6. Verify GIID, IPFS hash, and document hash are displayed

## Verification

### Check Database
```sql
SELECT 
  invoice_number,
  status,
  giid,
  blockchain_status,
  ipfs_hash,
  document_hash
FROM invoices
WHERE giid IS NOT NULL;
```

### Check Backend Logs
Look for:
```
🔌 Connecting to odoo ERP for MSME: MSME001
   ✓ Authentication successful
   ✓ Connection saved
   🔄 Triggering initial invoice sync...
   ✅ Initial sync completed: 5 invoices

[Identity Engine] Registering invoice: INV/2026/0045
   ✓ Canonical invoice generated
   ✓ Document hash: 3f4a8b9c...
   ✓ IPFS upload successful: QmX7f3a...
   ✓ Blockchain registration successful
   ✓ GIID created: GIID-2026-03-09-ABC123...
✅ Updated invoice 45 in PostgreSQL with blockchain data
```

### Check Frontend Console
Look for:
```
Registering invoice identity for ERP Invoice ID: 45
```

## Troubleshooting

### Issue: "Invoice not posted"
**Solution:** Only posted invoices can be registered. Check invoice status in Odoo.

### Issue: "GSTIN missing"
**Solution:** Ensure buyer and seller have valid GSTIN in Odoo.

### Issue: "Failed to upload to IPFS"
**Solution:** Check IPFS service is running and accessible.

### Issue: "Failed to register on blockchain"
**Solution:** Check Hyperledger Fabric network is running.

### Issue: Button stays disabled
**Solution:** Check browser console for errors. Verify JWT token is valid.

### Issue: PostgreSQL update failed
**Solution:** Check database connection. Run migration script again.

## Environment Variables

Ensure these are set in `invoice-backend/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=invoice_chain
DB_USER=postgres
DB_PASSWORD=your_password

# Odoo ERP
ODOO_URL=http://localhost:8069
ODOO_DB=invoice_chain
ODOO_USERNAME=admin
ODOO_PASSWORD=admin

# IPFS
IPFS_HOST=localhost
IPFS_PORT=5001

# Blockchain
USE_FABRIC=false
LEDGER_TYPE=postgres

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=24h
```

## API Testing with cURL

### Register Invoice
```bash
curl -X GET http://localhost:3000/invoice/45 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Invoice Details
```bash
curl -X GET http://localhost:3000/api/erp/invoices/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response
```json
{
  "success": true,
  "invoice": {
    "id": 1,
    "invoice_number": "INV/2026/0045",
    "status": "posted",
    "giid": "GIID-2026-03-09-ABC123...",
    "blockchain_status": "AVAILABLE",
    "ipfs_hash": "QmX7f3a9b2c1d4e5f...",
    "document_hash": "3f4a8b9c2d1e7f6a...",
    "amount": 150000.00,
    "total_amount": 177000.00
  }
}
```

## Migration Rollback (if needed)

```sql
-- Remove blockchain fields
ALTER TABLE invoices DROP COLUMN IF EXISTS blockchain_status;
ALTER TABLE invoices DROP COLUMN IF EXISTS ipfs_hash;
ALTER TABLE invoices DROP COLUMN IF EXISTS document_hash;
ALTER TABLE invoices DROP COLUMN IF EXISTS blockchain_tx_hash;
ALTER TABLE invoices DROP COLUMN IF EXISTS blockchain_block_number;
ALTER TABLE invoices DROP COLUMN IF EXISTS blockchain_timestamp;
ALTER TABLE invoices DROP COLUMN IF EXISTS seller_name;
ALTER TABLE invoices DROP COLUMN IF EXISTS gst_amount;
ALTER TABLE invoices DROP COLUMN IF EXISTS total_amount;

-- Remove indexes
DROP INDEX IF EXISTS idx_invoices_blockchain_status;
DROP INDEX IF EXISTS idx_invoices_ipfs_hash;
```

## Next Steps

After successful setup:

1. Test with multiple invoices
2. Verify blockchain data persistence
3. Test error scenarios (network failures, etc.)
4. Monitor IPFS storage usage
5. Check blockchain transaction logs
6. Implement lender financing workflow
