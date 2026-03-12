# Request Financing Feature - Implementation Complete

## Status: ✅ COMPLETED

## Overview
Implemented the Request Financing button functionality that registers invoices on the blockchain, making them available for lender financing.

## Architecture Flow

```
User clicks "Request Financing"
    ↓
Frontend: registerInvoiceIdentity(erp_invoice_id)
    ↓
Backend: GET /invoice/:id
    ↓
1. Fetch invoice from Odoo
2. Generate canonical invoice JSON
3. Create SHA-256 document hash
4. Upload to IPFS → receive CID
5. Generate binding hash
6. Register on Hyperledger Fabric
7. Create GIID (Global Invoice ID)
8. Update PostgreSQL invoices table
    ↓
Return: GIID, status, document_hash, ipfs_cid
    ↓
Frontend: Update UI with blockchain data
```

## Changes Made

### 1. Frontend: API Utility (`client/src/utils/api.ts`)

#### Added Function
```typescript
export async function registerInvoiceIdentity(erpInvoiceId: number): Promise<ApiResponse>
```

- Calls `GET /invoice/:id` endpoint
- Passes JWT token in Authorization header
- Returns blockchain registration response

### 2. Frontend: Invoice Detail Page (`client/src/pages/msme/InvoiceDetail.tsx`)

#### Added State Management
```typescript
const [registering, setRegistering] = useState(false);
const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
```

#### Added Interface Fields
```typescript
interface Invoice {
  erp_invoice_id?: number;
  blockchain_status?: string;
  // ... other fields
}
```

#### Implemented `handleRequestFinancing()` Function
- Validates invoice is posted
- Calls `registerInvoiceIdentity(erp_invoice_id)`
- Updates invoice state with blockchain data
- Shows success/error messages
- Handles "already registered" case

#### Added UI Components

**Blockchain Status Badge**
```typescript
getBlockchainStatusBadge(status?: string)
```
- 🟢 AVAILABLE - Ready for financing
- 🟡 LOCKED - Lender reviewing
- 🔵 FINANCED - Funded
- ⚫ CLOSED - Completed

**Request Financing Button**
- Disabled when invoice not posted
- Shows loading spinner during registration
- Displays processing steps
- Disabled after successful registration

**Registration Progress Indicator**
```
Processing your request...
• Generating canonical invoice
• Creating document hash
• Uploading to IPFS
• Registering on Hyperledger Fabric
```

**Success Message**
```
Invoice registered successfully! 
Your invoice is now available for financing.
```

**Already Registered Message**
```
This invoice has already been registered for financing.
```

#### Updated Invoice Information Card
- Shows ERP Status (posted, draft, etc.)
- Shows Blockchain Status (AVAILABLE, LOCKED, etc.)
- Displays GIID when available

#### Updated Actions Card
- Before registration: Shows "Request Financing" button
- After registration: Shows "View Financing Options" link
- Conditional rendering based on `isRegistered` flag

### 3. Backend: Database Migration (`invoice-backend/migrations/add-blockchain-fields.sql`)

#### Added Columns to `invoices` Table
```sql
blockchain_status VARCHAR(50)
ipfs_hash VARCHAR(255)
document_hash VARCHAR(64)
blockchain_tx_hash VARCHAR(255)
blockchain_block_number VARCHAR(50)
blockchain_timestamp TIMESTAMP
seller_name VARCHAR(500)
gst_amount DECIMAL(15, 2)
total_amount DECIMAL(15, 2)
```

#### Added Indexes
```sql
idx_invoices_blockchain_status
idx_invoices_ipfs_hash
```

### 4. Backend: Invoice Model (`invoice-backend/models/invoice.model.js`)

#### Added Methods

**`updateBlockchainData(id, blockchainData)`**
- Updates blockchain fields by invoice ID
- Uses COALESCE to preserve existing values

**`updateBlockchainDataByErpId(erp_invoice_id, blockchainData)`**
- Updates blockchain fields by ERP invoice ID
- Used by `/invoice/:id` endpoint

### 5. Backend: Server Endpoint (`invoice-backend/server.js`)

#### Updated `GET /invoice/:id` Endpoint
- After blockchain registration succeeds
- Updates PostgreSQL invoices table with:
  - GIID
  - IPFS hash
  - Document hash
  - Blockchain status
  - Timestamp
- Continues even if PostgreSQL update fails (blockchain is source of truth)

## Database Schema

### invoices Table (Updated)
```sql
id SERIAL PRIMARY KEY
msme_id VARCHAR(255)
erp_connection_id INTEGER
erp_invoice_id VARCHAR(255)
invoice_number VARCHAR(255)
invoice_date DATE
buyer_name VARCHAR(500)
buyer_gstin VARCHAR(50)
seller_name VARCHAR(500)
seller_gstin VARCHAR(50)
amount DECIMAL(15, 2)
gst_amount DECIMAL(15, 2)
total_amount DECIMAL(15, 2)
currency VARCHAR(10)
status VARCHAR(50)
giid VARCHAR(64)
ipfs_hash VARCHAR(255)
document_hash VARCHAR(64)
blockchain_status VARCHAR(50)
blockchain_tx_hash VARCHAR(255)
blockchain_block_number VARCHAR(50)
blockchain_timestamp TIMESTAMP
raw_data JSONB
normalized_hash VARCHAR(64)
blockchain_tx_id VARCHAR(255)
created_at TIMESTAMP
updated_at TIMESTAMP
```

## API Endpoints

### Register Invoice Identity
```
GET /invoice/:id
```

**Parameters:**
- `id` (path): ERP invoice ID from Odoo

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (Success):**
```json
{
  "giid": "GIID-2026-03-09-ABC123...",
  "status": "AVAILABLE",
  "document_hash": "3f4a8b9c2d1e7f6a...",
  "ipfs_cid": "QmX7f3a9b2c1d4e5f...",
  "registered": true,
  "created_at": "2026-03-09T10:30:00Z",
  "ledger_mode": "postgres",
  "canonical_invoice": { ... }
}
```

**Response (Already Registered):**
```json
{
  "message": "Invoice identity already exists",
  "giid": "GIID-2026-03-09-ABC123...",
  "status": "AVAILABLE"
}
```

**Response (Error):**
```json
{
  "error": "Invoice not posted"
}
```

## UI States

### Before Registration
- Button: "Request Financing" (enabled for posted invoices)
- Message: "Register this invoice on the blockchain to make it available for financing by lenders."
- Warning: "Only posted invoices can be registered for financing." (if not posted)

### During Registration
- Button: Shows spinner + "Registering..."
- Progress indicator showing 4 steps
- Button disabled

### After Registration (Success)
- Blockchain Status badge: 🟢 AVAILABLE
- Success message in green
- Button replaced with "View Financing Options" link
- GIID displayed in Invoice Information card
- IPFS hash displayed with link
- Document hash displayed with copy button

### After Registration (Already Exists)
- Info message: "This invoice has already been registered for financing."
- Shows blockchain data
- Button replaced with "View Financing Options" link

### Error State
- Error message in red
- Button re-enabled for retry
- Original state preserved

## Security

- ✅ JWT authentication required
- ✅ MSME ownership verified by backend
- ✅ Only posted invoices can be registered
- ✅ Duplicate registration prevented
- ✅ Blockchain data immutable after registration

## Testing Checklist

### Prerequisites
1. ✅ Run database migration: `add-blockchain-fields.sql`
2. ✅ MSME logged in with valid JWT token
3. ✅ ERP connected (Odoo)
4. ✅ Posted invoices synced from ERP

### Test Cases

**Test 1: Register New Invoice**
1. Navigate to invoice detail page
2. Verify "Request Financing" button is enabled
3. Click "Request Financing"
4. Verify loading state shows
5. Verify success message appears
6. Verify GIID, IPFS hash, document hash displayed
7. Verify button changes to "View Financing Options"
8. Verify blockchain status shows "AVAILABLE"

**Test 2: Already Registered Invoice**
1. Navigate to invoice that's already registered
2. Verify blockchain data is displayed
3. Verify "View Financing Options" link shown
4. Verify no "Request Financing" button

**Test 3: Draft Invoice**
1. Navigate to draft invoice detail page
2. Verify "Request Financing" button is disabled
3. Verify warning message shown

**Test 4: Network Error**
1. Disconnect network
2. Click "Request Financing"
3. Verify error message shown
4. Verify button re-enabled

**Test 5: Duplicate Registration**
1. Register invoice successfully
2. Manually enable button (dev tools)
3. Click again
4. Verify "already exists" message shown
5. Verify no error thrown

**Test 6: PostgreSQL Update**
1. Register invoice
2. Check PostgreSQL invoices table
3. Verify blockchain fields populated:
   - giid
   - ipfs_hash
   - document_hash
   - blockchain_status
   - blockchain_timestamp

## Backend Processing Steps

When `/invoice/:id` is called:

1. **Fetch from Odoo**
   - Get invoice header
   - Get invoice lines
   - Get buyer details (partner)
   - Get seller details (company)

2. **Validate**
   - Check invoice is posted
   - Verify buyer GSTIN exists
   - Verify seller GSTIN exists

3. **Generate Canonical Invoice**
   - Enforce canonical field ordering
   - Normalize data structure
   - Create deterministic JSON

4. **Create Document Hash**
   - SHA-256 hash of canonical JSON
   - Used for integrity verification

5. **Upload to IPFS**
   - Pin canonical invoice document
   - Receive IPFS CID

6. **Generate Binding Hash**
   - Combines document hash + IPFS CID
   - Creates tamper-proof binding

7. **Register on Hyperledger Fabric**
   - Submit transaction to chaincode
   - Store GIID, hashes, status
   - Record on immutable ledger

8. **Update PostgreSQL**
   - Store blockchain data in invoices table
   - Enable frontend queries
   - Sync with blockchain state

9. **Return Response**
   - GIID
   - Status (AVAILABLE)
   - Document hash
   - IPFS CID
   - Registration timestamp

## Error Handling

### Frontend Errors
- Network timeout → "Failed to register invoice. Please try again."
- Invalid response → "Unexpected response from server."
- Already registered → Info message (not error)

### Backend Errors
- Invoice not found → 404 "Invoice not found in Odoo"
- Invoice not posted → 400 "Invoice not posted"
- Missing GSTIN → 400 "GSTIN missing for partner/company"
- IPFS upload failed → 500 "Failed to upload to IPFS"
- Blockchain tx failed → 500 "Failed to register on blockchain"
- PostgreSQL update failed → Warning logged, continues (blockchain is source of truth)

## Future Enhancements

1. **Batch Registration**
   - Register multiple invoices at once
   - Progress bar for bulk operations

2. **Registration History**
   - Show timeline of registration events
   - Display transaction details

3. **Retry Mechanism**
   - Auto-retry failed registrations
   - Queue for offline processing

4. **Notifications**
   - Email notification on successful registration
   - SMS alert for lender interest

5. **Analytics**
   - Track registration success rate
   - Monitor IPFS upload times
   - Measure blockchain latency

## Notes

- ERP invoice ID is used (not PostgreSQL ID) because backend expects Odoo invoice ID
- Blockchain is source of truth - PostgreSQL is cache
- Registration is idempotent - safe to call multiple times
- GIID format: `GIID-YYYY-MM-DD-HASH`
- IPFS CID format: `Qm...` (CIDv0) or `bafy...` (CIDv1)
- Document hash: 64-character hex string (SHA-256)
