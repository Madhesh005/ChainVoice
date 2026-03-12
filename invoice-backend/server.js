const express = require("express");
const InvoiceModel = require('./models/invoice.model');

const { fetchInvoice, fetchInvoiceLines, fetchPartnerDetails, fetchCompanyDetails } = require("./odooClient");


// Use ledger service abstraction
const { LedgerService } = require("./ledgerService");
const PostgresLedger = require("./postgresLedger");

// Import Identity Engine
const { IdentityEngine } = require("./services/identityEngine");

// Import Verification Engine (Layer-5)
const { VerificationEngine } = require("./services/verificationEngine");
const { IPFSService } = require("./services/ipfsService");
const { ledgerService, identityEngine, ipfsService, verificationEngine } = require('./services');

const app = express();

// Enable CORS for frontend
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:4173'],
  credentials: true
}));

app.use(express.json());

// Import routes
const authRoutes = require('./routes/authRoutes');
const erpRoutes = require('./routes/erpRoutes');
const msmeRoutes = require('./routes/msmeRoutes');
const financingRoutes = require('./routes/financingRoutes');
const lenderRoutes = require('./routes/lenderRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/erp', erpRoutes);
app.use('/api/msme', msmeRoutes);
app.use('/api/financing', financingRoutes);
app.use('/api/lender', lenderRoutes);
app.use('/api/notifications', notificationRoutes);

// Add a direct route for invoice details (alternative to ERP route)
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // This is a simplified version that doesn't require authentication for testing
    // In production, you should add proper authentication
    const InvoiceModel = require('./models/invoice.model');
    const invoice = await InvoiceModel.findById(id);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }
    
    // Prepare response with database data
    const response = {
      success: true,
      data: {
        invoice,
        blockchain: {
          status: 'NOT_REGISTERED',
          verified: false,
          error: null
        }
      }
    };
    
    // Try to fetch blockchain data if GIID exists (optional, non-blocking)
    if (invoice.giid) {
      try {
        const { ledgerService } = require('./services');
        const blockchainInvoice = await ledgerService.verifyInvoice(invoice.giid);
        
        if (blockchainInvoice && blockchainInvoice.found) {
          response.data.blockchain = {
            status: blockchainInvoice.status || 'AVAILABLE',
            verified: true,
            locked_by: blockchainInvoice.locked_by,
            lender_id: blockchainInvoice.lender_id,
            financed_at: blockchainInvoice.financed_at,
            closed_at: blockchainInvoice.closed_at,
            created_at: blockchainInvoice.created_at,
            updated_at: blockchainInvoice.updated_at,
            error: null
          };
        } else {
          response.data.blockchain = {
            status: 'NOT_FOUND_ON_BLOCKCHAIN',
            verified: false,
            error: 'Invoice not found on blockchain (may need re-registration)'
          };
        }
      } catch (blockchainError) {
        console.warn('⚠️ Blockchain lookup failed (non-critical):', blockchainError.message);
        response.data.blockchain = {
          status: 'BLOCKCHAIN_ERROR',
          verified: false,
          error: blockchainError.message
        };
      }
    }
    
    res.json(response);
  } catch (error) {
    console.error('❌ Error fetching invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch invoice',
      details: error.message
    });
  }
});

console.log("financing routes mounted at /api/financing");
app.get("/test-db", async (req, res) => {
  try {
    const result = await require('./db').query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ledger service is initialized in services/index.js

app.get("/invoice/:id", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    console.log(`🔍 Processing invoice ID: ${invoiceId}`);

    // First, check if this invoice already exists in PostgreSQL with a GIID
    const InvoiceModel = require('./models/invoice.model');
    let existingInvoice = null;
    let existingGIID = null;
    
    try {
      existingInvoice = await InvoiceModel.findByErpInvoiceId(invoiceId);
      if (existingInvoice && existingInvoice.giid) {
        existingGIID = existingInvoice.giid;
        console.log(`📋 Found existing invoice in DB with GIID: ${existingGIID}`);
      }
    } catch (dbError) {
      console.warn(`⚠️  Database lookup failed: ${dbError.message}`);
    }

    const invoice = await fetchInvoice(invoiceId);
    
    // Check if invoice was found in Odoo
    if (!invoice || invoice.length === 0) {
      console.error(`❌ Invoice ID ${invoiceId} not found in Odoo ERP`);
      return res.status(404).json({ 
        error: "Invoice not found in ERP", 
        details: `Invoice ID ${invoiceId} does not exist in the connected Odoo system`
      });
    }

    const header = invoice[0];
    console.log(`📋 Found invoice: ${header.name} (State: ${header.state})`);

    if (header.state !== "posted") {
      console.error(`❌ Invoice ${header.name} is not posted (State: ${header.state})`);
      return res.status(400).json({ 
        error: "Invoice not posted", 
        details: `Invoice ${header.name} must be in 'posted' state to be processed. Current state: ${header.state}`
      });
    }

    const lines = await fetchInvoiceLines(header.invoice_line_ids);

    // Extract partner_id and company_id (Odoo returns as [id, name] array)
    const partnerId = Array.isArray(header.partner_id) ? header.partner_id[0] : header.partner_id;
    const companyId = Array.isArray(header.company_id) ? header.company_id[0] : header.company_id;

    console.log(`🔍 Fetching partner details for ID: ${partnerId}`);
    console.log(`🔍 Fetching company details for ID: ${companyId}`);

    // Fetch buyer (partner) details
    const partnerData = await fetchPartnerDetails(partnerId);
    if (!partnerData || partnerData.length === 0) {
      console.error(`❌ Partner ID ${partnerId} not found in Odoo`);
      return res.status(400).json({
        error: "Partner not found",
        details: `Partner ID ${partnerId} does not exist in Odoo`
      });
    }
    const partner = partnerData[0];

    // Fetch seller (company) details
    const companyData = await fetchCompanyDetails(companyId);
    if (!companyData || companyData.length === 0) {
      console.error(`❌ Company ID ${companyId} not found in Odoo`);
      return res.status(400).json({
        error: "Company not found",
        details: `Company ID ${companyId} does not exist in Odoo`
      });
    }
    const company = companyData[0];

    // Extract and trim GSTIN values
    const buyerGstin = partner.vat ? partner.vat.trim() : null;
    const sellerGstin = company.vat ? company.vat.trim() : null;

    // Validate GSTIN presence
    if (!buyerGstin) {
      return res.status(400).json({
        error: "GSTIN missing for partner",
        partner_id: partnerId,
        partner_name: partner.name
      });
    }

    if (!sellerGstin) {
      return res.status(400).json({
        error: "GSTIN missing for company",
        company_id: companyId,
        company_name: company.name
      });
    }

    const invoiceData = {
      header,
      lines,
      seller_gstin: sellerGstin,
      buyer_gstin: buyerGstin,
      invoiceId: invoiceId  // Pass invoice ID for document storage
    };

    // Use Identity Engine with reconciliation support
    const identity = await identityEngine.registerInvoiceWithReconciliation(invoiceData, existingGIID);

    // Build canonical for response (using identity engine's enforcement)
    const canonical = identityEngine.enforceCanonicalOrdering(invoiceData);

    // Ensure all required fields are present
    if (!identity.document_hash) {
      console.warn('⚠️  Warning: document_hash is missing from identity');
    }

    // Update PostgreSQL invoices table with blockchain data
    try {
      // Find invoice by ERP invoice ID first
      const invoiceRecord = await InvoiceModel.findByErpInvoiceId(invoiceId);
      
      if (!invoiceRecord) {
        console.error(`❌ Invoice not found in PostgreSQL for ERP ID: ${invoiceId}`);
        console.log('⚠️  Blockchain registration succeeded but PostgreSQL update failed');
      } else {
        // Update using primary key (id) - NEVER use erp_invoice_id for updates
        const updatedInvoice = await InvoiceModel.updateBlockchainData(invoiceRecord.id, {
          giid: identity.giid,
          ipfs_cid: identity.ipfs_cid,
          document_hash: identity.document_hash,
          blockchain_status: identity.status,
          blockchain_timestamp: new Date(),
        });
        
        if (updatedInvoice) {
          console.log(`✅ Updated invoice ${invoiceRecord.id} in PostgreSQL with blockchain data`);
          console.log(`   GIID: ${identity.giid}`);
          console.log(`   IPFS CID: ${identity.ipfs_cid}`);
          console.log(`   Status: ${identity.status}`);
          console.log(`   Reconciled: ${identity.reconciled ? 'Yes' : 'No'}`);
        } else {
          console.error(`❌ Failed to update invoice ${invoiceRecord.id} in PostgreSQL`);
        }
      }
    } catch (dbError) {
      console.error('❌ PostgreSQL update error:', dbError.message);
      console.error('   Stack:', dbError.stack);
      // Continue even if PostgreSQL update fails - blockchain registration succeeded
    }

    // Log activity if this is a new registration or reconciliation
    if (identity.registered || identity.reconciled) {
      const ActivityModel = require('./models/activity.model');
      try {
        // Get MSME ID from invoice
        const invoiceRecord = await InvoiceModel.findByMSME('*', {
          erp_invoice_id: invoiceId.toString()
        });

        if (invoiceRecord && invoiceRecord.length > 0) {
          const msmeId = invoiceRecord[0].msme_id;

          const activityType = identity.reconciled ? 'invoice_reconciled' : 'invoice_registered';
          const activityTitle = identity.reconciled ? 
            'Invoice Re-registered on Blockchain' : 
            'Invoice Registered on Blockchain';
          const activityDescription = identity.reconciled ?
            `Invoice ${header.name} re-registered after ledger reset` :
            `Invoice ${header.name} registered and ready for financing`;

          await ActivityModel.logActivity({
            msme_id: msmeId,
            activity_type: activityType,
            activity_title: activityTitle,
            activity_description: activityDescription,
            related_invoice_id: invoiceRecord[0].id,
            related_invoice_number: header.name,
            metadata: {
              amount: header.amount_total,
              currency: 'INR',
              giid: identity.giid,
              reconciled: identity.reconciled || false,
            },
          });
          console.log(`✅ Activity logged for invoice ${identity.reconciled ? 're-registration' : 'registration'}`);
        }
      } catch (activityError) {
        console.warn('⚠️  Warning: Failed to log activity:', activityError.message);
        // Continue even if activity logging fails
      }
    }

    res.json({
      success: true,
      data: {
        giid: identity.giid,
        canonical_invoice: canonical,
        status: identity.status,
        document_hash: identity.document_hash,
        ipfs_cid: identity.ipfs_cid,
        registered: identity.registered,
        reconciled: identity.reconciled || false,
        created_at: identity.created_at,
        ledger_mode: identity.ledger_mode,
      },
      message: identity.message
    });

  } catch (error) {
    console.error('\n❌ Invoice processing failed:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);

    // Provide more specific error messages
    let errorMessage = "Failed to process invoice";
    let errorDetails = error.message;

    if (error.message.includes('No valid responses from any peers')) {
      errorMessage = "Blockchain network error";
      errorDetails = "Unable to connect to blockchain network. Please try again later.";
    } else if (error.message.includes('Document storage failed')) {
      errorMessage = "Document processing error";
      errorDetails = error.message;
    } else if (error.message.includes('already exists')) {
      errorMessage = "Invoice already registered";
      errorDetails = "This invoice has already been registered on the blockchain.";
    }

    res.status(500).json({
      error: errorMessage,
      details: errorDetails
    });
  }
});

// Verify invoice with cryptographic proof (Layer-5)
app.get("/verify/:giid", async (req, res) => {
  try {
    const { giid } = req.params;

    console.log(`\n[API] Layer-5 verification request for GIID: ${giid.substring(0, 32)}...`);

    // Use Verification Engine for cryptographic proof
    const verification = await verificationEngine.verifyInvoice(giid);

    // Return 404 if invoice not found in ledger
    if (!verification.ledger_verified) {
      return res.status(404).json({
        error: "Invoice not found in ledger",
        giid: giid,
        verification_result: "FAILED",
        reason: verification.reason
      });
    }

    // Return verification result with full proof
    const statusCode = verification.verification_result === 'TRUSTED' ? 200 : 400;

    res.status(statusCode).json({
      giid: verification.giid,
      invoice_number: verification.invoice_number,
      status: verification.status,
      ledger_verified: verification.ledger_verified,
      ipfs_reachable: verification.ipfs_reachable,
      document_hash_match: verification.document_hash_match,
      binding_hash_match: verification.binding_hash_match,
      verification_result: verification.verification_result,
      ipfs_cid: verification.ipfs_cid,
      ledger_document_hash: verification.ledger_document_hash,
      computed_document_hash: verification.computed_document_hash,
      ledger_binding_hash: verification.ledger_binding_hash,
      computed_binding_hash: verification.computed_binding_hash,
      file_size: verification.file_size,
      pdf_signature: verification.pdf_signature,
      timestamp: verification.timestamp,
      reason: verification.reason,
      layer: 'LAYER-5-CRYPTOGRAPHIC-PROOF'
    });
  } catch (error) {
    console.error('[API] Verification error:', error);
    res.status(500).json({
      error: "Verification failed",
      message: error.message,
      verification_result: "FAILED"
    });
  }
});

// Get invoice identity by GIID (preferred endpoint)
app.get("/identity/:giid", async (req, res) => {
  try {
    const { giid } = req.params;
    console.log(`🔍 Identity lookup requested for GIID: ${giid}`);
    
    const identity = await identityEngine.getIdentityWithHistory(giid);
    console.log(`📋 Identity result:`, {
      found: identity.found,
      status: identity.status,
      ledger_mode: identity.ledger_mode
    });

    if (!identity.found) {
      console.log(`❌ Invoice identity not found for GIID: ${giid}`);
      return res.json({
        success: false,
        error: "Invoice identity not found",
        giid: giid
      });
    }

    // Map blockchain status to verification-friendly format
    let blockchain_status = identity.status;
    let verification_result = 'UNKNOWN';
    
    if (identity.status === 'AVAILABLE') {
      verification_result = 'REGISTERED';
    } else if (identity.status === 'LOCKED') {
      verification_result = 'LOCKED';
    } else if (identity.status === 'FINANCED') {
      verification_result = 'FINANCED';
    } else if (identity.status === 'CLOSED') {
      verification_result = 'CLOSED';
    }

    console.log(`✅ Returning identity: blockchain_status=${blockchain_status}, verification_result=${verification_result}`);

    res.json({
      success: true,
      giid: identity.giid,
      invoice_number: identity.invoice_number,
      status: verification_result, // Use verification-friendly status
      blockchain_status: blockchain_status, // Original blockchain status
      locked_by: identity.locked_by,
      lender_id: identity.lender_id,
      document_hash: identity.document_hash,
      ipfs_cid: identity.ipfs_cid,
      financed_at: identity.financed_at,
      closed_at: identity.closed_at,
      created_at: identity.created_at,
      ledger_mode: identity.ledger_mode,
      history: identity.history
    });
  } catch (error) {
    console.error('❌ Error retrieving invoice identity:', error);
    res.json({ 
      success: false,
      error: "Failed to retrieve invoice identity",
      details: error.message
    });
  }
});

// Verify document integrity (Layer-3 verification)

// Verify document integrity
app.get("/verify-document/:giid", async (req, res) => {
  try {
    const { giid } = req.params;
    const verification = await identityEngine.verifyDocumentIntegrity(giid);

    if (verification.integrity === 'NOT_FOUND') {
      return res.status(404).json({
        error: "Invoice identity not found",
        giid: giid
      });
    }

    // Full transparency - expose ALL verification fields
    res.json({
      giid: verification.giid,
      invoice_number: verification.invoice_number,
      integrity: verification.integrity,
      ipfs_cid: verification.ipfs_cid,
      stored_hash: verification.stored_hash,
      cid_hash: verification.cid_hash,
      binding_hash: verification.binding_hash,
      stored_binding_hash: verification.stored_binding_hash,
      binding_match: verification.binding_match,
      match: verification.match,
      verification_method: verification.verification_method,
      message: verification.message,
      error: verification.error
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify document" });
  }
});

// Lock invoice (atomic operation)
app.post("/lock", async (req, res) => {
  try {
    const { giid, lender_id } = req.body;

    // Support legacy 'invoice_hash' parameter
    const invoiceGiid = giid || req.body.invoice_hash;

    if (!invoiceGiid || !lender_id) {
      return res.status(400).json({
        error: "Missing required fields: giid (or invoice_hash), lender_id"
      });
    }

    const result = await ledgerService.lockInvoice(invoiceGiid, lender_id);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        current_status: result.current_status,
        locked_by: result.locked_by
      });
    }

    res.json({
      success: true,
      message: "Invoice locked successfully",
      invoice: {
        giid: result.invoice.invoice_hash,
        invoice_number: result.invoice.invoice_number,
        status: result.invoice.status,
        locked_by: result.invoice.locked_by,
        updated_at: result.invoice.updated_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to lock invoice" });
  }
});

// Finance invoice
app.post("/finance", async (req, res) => {
  try {
    const { giid, lender_id } = req.body;

    // Support legacy 'invoice_hash' parameter
    const invoiceGiid = giid || req.body.invoice_hash;

    if (!invoiceGiid || !lender_id) {
      return res.status(400).json({
        error: "Missing required fields: giid (or invoice_hash), lender_id"
      });
    }

    const result = await ledgerService.financeInvoice(invoiceGiid, lender_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Invoice financed successfully",
      invoice: {
        giid: result.invoice.invoice_hash,
        invoice_number: result.invoice.invoice_number,
        status: result.invoice.status,
        lender_id: result.invoice.lender_id,
        financed_at: result.invoice.financed_at,
        updated_at: result.invoice.updated_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to finance invoice" });
  }
});

// Close invoice
app.post("/close", async (req, res) => {
  try {
    const { giid } = req.body;

    // Support legacy 'invoice_hash' parameter
    const invoiceGiid = giid || req.body.invoice_hash;

    if (!invoiceGiid) {
      return res.status(400).json({
        error: "Missing required field: giid (or invoice_hash)"
      });
    }

    const result = await ledgerService.closeInvoice(invoiceGiid);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Invoice closed successfully",
      invoice: {
        giid: result.invoice.invoice_hash,
        invoice_number: result.invoice.invoice_number,
        status: result.invoice.status,
        closed_at: result.invoice.closed_at,
        updated_at: result.invoice.updated_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to close invoice" });
  }
});

// Unlock invoice (optional - for cancellation)
app.post("/unlock", async (req, res) => {
  try {
    const { giid, lender_id } = req.body;

    // Support legacy 'invoice_hash' parameter
    const invoiceGiid = giid || req.body.invoice_hash;

    if (!invoiceGiid || !lender_id) {
      return res.status(400).json({
        error: "Missing required fields: giid (or invoice_hash), lender_id"
      });
    }

    const result = await ledgerService.unlockInvoice(invoiceGiid, lender_id);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: "Invoice unlocked successfully",
      invoice: {
        giid: result.invoice.invoice_hash,
        invoice_number: result.invoice.invoice_number,
        status: result.invoice.status,
        locked_by: result.invoice.locked_by,
        updated_at: result.invoice.updated_at
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to unlock invoice" });
  }
});

// Query invoices by status
app.get("/invoices/status/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const invoices = await ledgerService.queryInvoicesByStatus(status.toUpperCase());
    res.json({ invoices, count: invoices.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to query invoices" });
  }
});

// Query invoices by lender
app.get("/invoices/lender/:lenderId", async (req, res) => {
  try {
    const { lenderId } = req.params;
    const invoices = await ledgerService.queryInvoicesByLender(lenderId);
    res.json({ invoices, count: invoices.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to query invoices" });
  }
});

// Get ledger statistics
app.get("/statistics", async (req, res) => {
  try {
    const stats = await ledgerService.getStatistics();
    res.json(stats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

// Get invoice history
app.get("/history/:hash", async (req, res) => {
  try {
    const { hash } = req.params;
    const history = await ledgerService.getInvoiceHistory(hash);
    res.json({ invoice_hash: hash, history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get invoice history" });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});