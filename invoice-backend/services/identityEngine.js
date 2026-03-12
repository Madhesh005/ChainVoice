/**
 * Identity Engine Service
 * 
 * Formal abstraction for invoice identity management.
 * Enforces GIID (Global Invoice ID) semantics and immutability.
 * 
 * Core Principles:
 * - Invoice identity is immutable once created
 * - GIID is deterministically generated from canonical invoice
 * - Strict validation and ordering enforcement
 * - State enforcement boundary
 * - Document storage in IPFS (Layer-3)
 */

const { buildCanonicalInvoice } = require('../canonicalize');
const { generateHash } = require('../hashService');
const { DocumentService } = require('./documentService');

class IdentityEngine {
  constructor(ledgerService) {
    this.ledgerService = ledgerService;
    this.ledgerMode = process.env.USE_FABRIC === 'true' ? 'fabric' : 'postgres';
    this.documentService = new DocumentService();
  }

  /**
   * Validate canonical invoice structure
   * Ensures all required fields are present and properly formatted
   */
  validateCanonicalInvoice(canonical) {
    const errors = [];

    // Required fields
    if (!canonical.seller_gstin) errors.push('seller_gstin is required');
    if (!canonical.buyer_gstin) errors.push('buyer_gstin is required');
    if (!canonical.invoice_number) errors.push('invoice_number is required');
    if (!canonical.invoice_date) errors.push('invoice_date is required');
    if (!canonical.total_amount) errors.push('total_amount is required');
    if (!canonical.line_items || !Array.isArray(canonical.line_items)) {
      errors.push('line_items must be an array');
    }

    // Check for undefined/null fields
    Object.entries(canonical).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        errors.push(`${key} cannot be undefined or null`);
      }
    });

    // Validate line items
    if (canonical.line_items) {
      canonical.line_items.forEach((item, index) => {
        if (!item.description) errors.push(`line_items[${index}].description is required`);
        if (!item.quantity) errors.push(`line_items[${index}].quantity is required`);
        if (!item.unit_price) errors.push(`line_items[${index}].unit_price is required`);
        if (!item.subtotal) errors.push(`line_items[${index}].subtotal is required`);
      });
    }

    if (errors.length > 0) {
      throw new Error(`Canonical invoice validation failed: ${errors.join(', ')}`);
    }

    return true;
  }

  /**
   * Enforce deterministic ordering and formatting
   * Critical for preventing hash drift
   */
  enforceCanonicalOrdering(data) {
    const { header, lines, seller_gstin, buyer_gstin } = data;

    // Build canonical with strict ordering
    const canonical = {
      seller_gstin: seller_gstin.trim(),
      buyer_gstin: buyer_gstin.trim(),
      invoice_number: header.name,
      invoice_date: header.invoice_date,
      total_amount: Number(header.amount_total).toFixed(2),
      line_items: lines
        .map(line => ({
          description: line.name,
          quantity: Number(line.quantity).toFixed(2),
          unit_price: Number(line.price_unit).toFixed(2),
          subtotal: Number(line.price_subtotal).toFixed(2)
        }))
        .sort((a, b) => a.description.localeCompare(b.description))
    };

    return canonical;
  }

  /**
   * Generate GIID (Global Invoice ID) from canonical invoice
   * GIID is the SHA-256 hash of the canonical JSON representation
   */
  generateGIID(canonical) {
    this.validateCanonicalInvoice(canonical);
    return generateHash(canonical);
  }

  /**
   * Generate binding hash to cryptographically bind GIID and document hash
   * 
   * binding_hash = SHA256(giid + document_hash)
   * 
   * This creates an immutable cryptographic link between invoice identity
   * and document content, preventing any tampering or substitution.
   * 
   * @param {string} giid - Global Invoice ID
   * @param {string} documentHash - SHA-256 hash of PDF document
   * @returns {string} Binding hash (hex)
   */
  generateBindingHash(giid, documentHash) {
    const crypto = require('crypto');
    
    if (!giid || !documentHash) {
      throw new Error('GIID and DocumentHash are required for binding');
    }

    return crypto.createHash('sha256').update(giid + documentHash).digest('hex');
  }

  /**
   * Register invoice and establish identity
   * 
   * @param {Object} invoiceData - Raw invoice data with header, lines, and GSTIN
   * @returns {Object} Identity object with GIID and metadata
   */
  /**
   * Register invoice with blockchain reconciliation support
   * Handles cases where database has GIID but blockchain ledger was reset
   */
  async registerInvoiceWithReconciliation(invoiceData, existingGIID = null) {
    console.log(`\n🔄 Starting invoice registration with reconciliation...`);
    
    // Enforce canonical ordering
    const canonical = this.enforceCanonicalOrdering(invoiceData);

    // Generate GIID (or use existing if provided)
    let giid = existingGIID || this.generateGIID(canonical);
    let isReregistration = false;

    console.log(`   GIID: ${giid}`);
    console.log(`   Existing GIID provided: ${existingGIID ? 'Yes' : 'No'}`);

    // If we have an existing GIID, check if it exists on the blockchain
    if (existingGIID) {
      console.log(`\n🔍 Checking blockchain for existing GIID...`);
      
      try {
        const existing = await this.ledgerService.verifyInvoice(existingGIID);
        
        if (existing.found) {
          console.log(`✅ Invoice found on blockchain - already registered`);
          console.log(`   Status: ${existing.status}`);
          console.log(`   Document Hash: ${existing.document_hash || 'N/A'}`);
          console.log(`   IPFS CID: ${existing.ipfs_cid || 'N/A'}`);
          
          return {
            giid: existingGIID,
            status: existing.status,
            seller_gstin: canonical.seller_gstin,
            buyer_gstin: canonical.buyer_gstin,
            invoice_number: canonical.invoice_number,
            document_hash: existing.document_hash || null,
            ipfs_cid: existing.ipfs_cid || null,
            created_at: existing.created_at,
            ledger_mode: this.ledgerMode,
            registered: false,
            reconciled: false,
            message: 'Invoice already registered on blockchain'
          };
        } else {
          console.log(`⚠️  Invoice NOT found on blockchain - ledger reset detected`);
          console.log(`   Will re-register with new GIID to avoid conflicts`);
          
          // Generate new GIID to avoid potential conflicts
          giid = this.generateGIID(canonical);
          isReregistration = true;
          
          console.log(`   New GIID: ${giid}`);
        }
      } catch (error) {
        console.warn(`⚠️  Blockchain lookup failed: ${error.message}`);
        console.log(`   Assuming ledger reset - will re-register with new GIID`);
        
        // Generate new GIID for safety
        giid = this.generateGIID(canonical);
        isReregistration = true;
        
        console.log(`   New GIID: ${giid}`);
      }
    } else {
      // No existing GIID - check if newly generated GIID exists
      console.log(`\n🔍 Checking blockchain for newly generated GIID...`);
      
      try {
        const existing = await this.ledgerService.verifyInvoice(giid);
        
        if (existing.found) {
          console.log(`✅ Invoice already exists on blockchain`);
          
          return {
            giid: giid,
            status: existing.status,
            seller_gstin: canonical.seller_gstin,
            buyer_gstin: canonical.buyer_gstin,
            invoice_number: canonical.invoice_number,
            document_hash: existing.document_hash || null,
            ipfs_cid: existing.ipfs_cid || null,
            created_at: existing.created_at,
            ledger_mode: this.ledgerMode,
            registered: false,
            reconciled: false,
            message: 'Invoice identity already exists'
          };
        }
      } catch (error) {
        console.warn(`⚠️  Blockchain lookup failed: ${error.message}`);
        console.log(`   Proceeding with registration...`);
      }
    }

    // Extract invoice ID from header
    const invoiceId = invoiceData.header.id || invoiceData.invoiceId;
    
    if (!invoiceId) {
      throw new Error('Invoice ID is required for document storage');
    }

    // Store document in IPFS (Layer-3)
    console.log(`\n📄 Storing document for GIID: ${giid}`);
    console.log(`   Invoice ID: ${invoiceId}`);
    console.log(`   Invoice Number: ${invoiceData.header.name}`);
    console.log(`   Re-registration: ${isReregistration ? 'Yes' : 'No'}`);
    
    let documentHash = null;
    let ipfsCID = null;

    try {
      const docResult = await this.documentService.storeDocument(
        giid, 
        invoiceId, 
        invoiceData.header.name
      );
      
      documentHash = docResult.document_hash;
      ipfsCID = docResult.ipfs_cid;
      
      console.log(`✓ PDF fetched and hashed`);
      console.log(`✓ Document Hash: ${documentHash}`);
      console.log(`✓ IPFS CID: ${ipfsCID || 'N/A (IPFS not configured)'}`);
      
      if (!documentHash) {
        throw new Error('Document hash generation failed');
      }

      if (this.documentService.isConfigured() && !ipfsCID) {
        throw new Error('IPFS upload failed - CID not returned');
      }

    } catch (error) {
      console.error(`\n❌ Document storage failed: ${error.message}`);
      throw new Error(`Document storage failed: ${error.message}`);
    }

    // Generate binding hash
    const bindingHash = this.generateBindingHash(giid, documentHash);
    console.log(`✓ Binding Hash: ${bindingHash}`);

    // Register invoice in ledger
    console.log(`\n💾 Registering in ledger...`);
    
    const registered = await this.ledgerService.registerInvoice(
      giid, 
      invoiceData.header.name,
      documentHash,
      ipfsCID,
      bindingHash
    );

    if (!registered) {
      console.log(`⚠️  Race condition detected - invoice already registered`);
      const recheck = await this.ledgerService.verifyInvoice(giid);
      return {
        giid: giid,
        status: recheck.status,
        seller_gstin: canonical.seller_gstin,
        buyer_gstin: canonical.buyer_gstin,
        invoice_number: canonical.invoice_number,
        document_hash: recheck.document_hash || null,
        ipfs_cid: recheck.ipfs_cid || null,
        created_at: recheck.created_at,
        ledger_mode: this.ledgerMode,
        registered: false,
        reconciled: isReregistration,
        message: 'Invoice identity already exists (race condition)'
      };
    }

    // Successfully registered
    const newInvoice = await this.ledgerService.verifyInvoice(giid);

    console.log(`✅ Invoice ${isReregistration ? 're-registered' : 'registered'} successfully`);
    console.log(`   GIID: ${giid}`);
    console.log(`   Status: ${newInvoice.status}`);
    console.log(`   Document Hash: ${documentHash}`);
    console.log(`   IPFS CID: ${ipfsCID || 'N/A'}\n`);

    return {
      giid: giid,
      status: newInvoice.status,
      seller_gstin: canonical.seller_gstin,
      buyer_gstin: canonical.buyer_gstin,
      invoice_number: canonical.invoice_number,
      document_hash: documentHash,
      ipfs_cid: ipfsCID,
      created_at: newInvoice.created_at,
      ledger_mode: this.ledgerMode,
      registered: true,
      reconciled: isReregistration,
      message: isReregistration ? 
        'Invoice re-registered after ledger reset' : 
        'Invoice identity created successfully'
    };
  }

  async registerInvoice(invoiceData) {
    // Enforce canonical ordering
    const canonical = this.enforceCanonicalOrdering(invoiceData);

    // Generate GIID
    const giid = this.generateGIID(canonical);

    // Check if GIID already exists in ledger
    const existing = await this.ledgerService.verifyInvoice(giid);

    if (existing.found) {
      // Invoice identity already exists - return existing state
      // Do NOT upload document again (idempotency)
      console.log(`✓ GIID already exists: ${giid}`);
      console.log(`✓ Document Hash: ${existing.document_hash || 'N/A'}`);
      console.log(`✓ IPFS CID: ${existing.ipfs_cid || 'N/A'}`);
      
      return {
        giid: giid,
        status: existing.status,
        seller_gstin: canonical.seller_gstin,
        buyer_gstin: canonical.buyer_gstin,
        invoice_number: canonical.invoice_number,
        document_hash: existing.document_hash || null,
        ipfs_cid: existing.ipfs_cid || null,
        created_at: existing.created_at,
        ledger_mode: this.ledgerMode,
        registered: false, // Not newly registered
        message: 'Invoice identity already exists'
      };
    }

    // Extract invoice ID from header
    const invoiceId = invoiceData.header.id || invoiceData.invoiceId;
    
    if (!invoiceId) {
      throw new Error('Invoice ID is required for document storage');
    }

    // Store document in IPFS (Layer-3) - REQUIRED, NO SILENT FAILURES
    console.log(`\n📄 Storing document for GIID: ${giid}`);
    console.log(`   Invoice ID: ${invoiceId}`);
    console.log(`   Invoice Number: ${invoiceData.header.name}`);
    
    let documentHash = null;
    let ipfsCID = null;

    try {
      const docResult = await this.documentService.storeDocument(
        giid, 
        invoiceId, 
        invoiceData.header.name
      );
      
      documentHash = docResult.document_hash;
      ipfsCID = docResult.ipfs_cid;
      
      console.log(`✓ PDF fetched and hashed`);
      console.log(`✓ Document Hash: ${documentHash}`);
      console.log(`✓ IPFS CID: ${ipfsCID || 'N/A (IPFS not configured)'}`);
      
      // Validate document hash was generated
      if (!documentHash) {
        throw new Error('Document hash generation failed');
      }

      // If IPFS is configured, CID should be present
      if (this.documentService.isConfigured() && !ipfsCID) {
        throw new Error('IPFS upload failed - CID not returned');
      }

    } catch (error) {
      console.error(`\n❌ Document storage failed: ${error.message}`);
      console.error('   Cannot register invoice without document storage');
      
      // Re-throw error - DO NOT continue registration
      throw new Error(`Document storage failed: ${error.message}`);
    }

    // Generate binding hash to cryptographically link GIID and document
    const bindingHash = this.generateBindingHash(giid, documentHash);
    console.log(`✓ Binding Hash: ${bindingHash}`);

    // Register new invoice in ledger with document metadata and binding hash
    console.log(`\n💾 Registering in ledger...`);
    
    const registered = await this.ledgerService.registerInvoice(
      giid, 
      invoiceData.header.name,
      documentHash,
      ipfsCID,
      bindingHash
    );

    if (!registered) {
      // Race condition: another process registered between check and insert
      console.log(`⚠️  Race condition detected - invoice already registered`);
      const recheck = await this.ledgerService.verifyInvoice(giid);
      return {
        giid: giid,
        status: recheck.status,
        seller_gstin: canonical.seller_gstin,
        buyer_gstin: canonical.buyer_gstin,
        invoice_number: canonical.invoice_number,
        document_hash: recheck.document_hash || null,
        ipfs_cid: recheck.ipfs_cid || null,
        created_at: recheck.created_at,
        ledger_mode: this.ledgerMode,
        registered: false,
        message: 'Invoice identity already exists (race condition)'
      };
    }

    // Successfully registered new identity
    const newInvoice = await this.ledgerService.verifyInvoice(giid);

    console.log(`✅ Invoice registered successfully`);
    console.log(`   GIID: ${giid}`);
    console.log(`   Status: ${newInvoice.status}`);
    console.log(`   Document Hash: ${documentHash}`);
    console.log(`   IPFS CID: ${ipfsCID || 'N/A'}\n`);

    return {
      giid: giid,
      status: newInvoice.status,
      seller_gstin: canonical.seller_gstin,
      buyer_gstin: canonical.buyer_gstin,
      invoice_number: canonical.invoice_number,
      document_hash: documentHash,
      ipfs_cid: ipfsCID,
      created_at: newInvoice.created_at,
      ledger_mode: this.ledgerMode,
      registered: true,
      message: 'Invoice identity created successfully'
    };
  }

  /**
   * Verify invoice identity by GIID
   * 
   * @param {string} giid - Global Invoice ID
   * @returns {Object} Identity status and metadata
   */
  async verifyInvoice(giid) {
    const result = await this.ledgerService.verifyInvoice(giid);

    if (!result.found) {
      return {
        found: false,
        giid: giid,
        message: 'Invoice identity not found'
      };
    }

    return {
      found: true,
      giid: result.invoice_hash,
      invoice_number: result.invoice_number,
      status: result.status,
      locked_by: result.locked_by,
      lender_id: result.lender_id,
      financed_at: result.financed_at,
      closed_at: result.closed_at,
      created_at: result.created_at,
      document_hash: result.document_hash || null,
      ipfs_cid: result.ipfs_cid || null,
      binding_hash: result.binding_hash || null,
      ledger_mode: this.ledgerMode
    };
  }

  /**
   * Get invoice status by GIID
   * 
   * @param {string} giid - Global Invoice ID
   * @returns {Object} Status information
   */
  async getStatus(giid) {
    const result = await this.verifyInvoice(giid);

    if (!result.found) {
      return {
        found: false,
        giid: giid,
        status: null,
        message: 'Invoice identity not found'
      };
    }

    return {
      found: true,
      giid: result.giid,
      status: result.status,
      invoice_number: result.invoice_number,
      locked_by: result.locked_by,
      lender_id: result.lender_id,
      financed_at: result.financed_at,
      closed_at: result.closed_at,
      created_at: result.created_at,
      document_hash: result.document_hash,
      ipfs_cid: result.ipfs_cid,
      ledger_mode: this.ledgerMode
    };
  }

  /**
   * Get full identity with history
   * 
   * @param {string} giid - Global Invoice ID
   * @returns {Object} Complete identity information with history
   */
  async getIdentityWithHistory(giid) {
    const status = await this.getStatus(giid);

    if (!status.found) {
      return status;
    }

    const history = await this.ledgerService.getInvoiceHistory(giid);

    return {
      ...status,
      history: history
    };
  }

  /**
   * Verify document integrity using CID-based cryptographic verification
   * 
   * Purely deterministic. No HTTP downloads. No network dependency.
   * Extracts multihash from CID and compares with stored SHA-256.
   * 
   * Uses CommonJS-compatible 'cids' package (not ESM-only 'multiformats').
   * 
   * @param {string} giid - Global Invoice ID
   * @returns {Object} Verification result
   */
  async verifyDocumentIntegrity(giid) {
    const CID = require('cids');
    
    const identity = await this.verifyInvoice(giid);

    if (!identity.found) {
      return {
        giid: giid,
        integrity: 'NOT_FOUND',
        message: 'Invoice identity not found'
      };
    }

    const storedHash = identity.document_hash;
    const ipfsCid = identity.ipfs_cid;

    // Check if document metadata exists
    if (!ipfsCid) {
      return {
        giid: giid,
        invoice_number: identity.invoice_number,
        integrity: 'NO_DOCUMENT',
        message: 'No IPFS CID available for this invoice',
        stored_hash: storedHash
      };
    }

    if (!storedHash) {
      return {
        giid: giid,
        invoice_number: identity.invoice_number,
        integrity: 'NO_HASH',
        message: 'No document hash stored for this invoice',
        ipfs_cid: ipfsCid
      };
    }

    try {
      console.log(`\n🔍 CID-based cryptographic verification`);
      console.log(`   GIID: ${giid}`);
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Stored Hash: ${storedHash}`);

      // Parse CID using CommonJS-compatible 'cids' package
      const cid = new CID(ipfsCid);
      
      // Multihash format: [hashFunctionCode][digestLength][digest]
      // Skip first 2 bytes to get the actual digest
      const digest = cid.multihash.slice(2);
      
      // Convert digest to hex
      const cidHashHex = Buffer.from(digest).toString('hex');

      console.log(`   CID Hash: ${cidHashHex}`);

      // Generate binding hash and verify it matches stored binding
      const bindingHash = this.generateBindingHash(giid, storedHash);
      const storedBindingHash = identity.binding_hash;
      
      console.log(`   Computed Binding Hash: ${bindingHash}`);
      console.log(`   Stored Binding Hash: ${storedBindingHash || 'N/A'}`);

      // Verify binding integrity - STRICT: binding_hash MUST exist
      // If binding_hash is missing, it means the record was created before binding was implemented
      // For strict enforcement, we should fail if binding is missing
      const bindingMatch = storedBindingHash ? (bindingHash === storedBindingHash) : false;
      
      // If no stored binding hash exists, log warning
      if (!storedBindingHash) {
        console.log(`   ⚠️  WARNING: No stored binding hash - record may predate binding implementation`);
      }

      // Compare hashes - BOTH CID and binding must match
      const cidMatch = cidHashHex === storedHash;
      const isValid = cidMatch && bindingMatch;

      console.log(`\n📊 Verification Result:`);
      console.log(`   Stored Hash: ${storedHash}`);
      console.log(`   CID Hash:    ${cidHashHex}`);
      console.log(`   CID Match: ${cidMatch}`);
      console.log(`   Binding Match: ${bindingMatch}`);
      console.log(`   Overall Match: ${isValid}`);
      console.log(`   Integrity: ${isValid ? 'VALID' : 'TAMPERED'}\n`);

      return {
        giid: giid,
        invoice_number: identity.invoice_number,
        integrity: isValid ? 'VALID' : 'TAMPERED',
        stored_hash: storedHash,
        cid_hash: cidHashHex,
        binding_hash: bindingHash,
        stored_binding_hash: storedBindingHash,
        binding_match: bindingMatch,
        ipfs_cid: ipfsCid,
        match: isValid,
        verification_method: 'CID_CRYPTOGRAPHIC_BINDING'
      };

    } catch (error) {
      console.error('\n❌ CID verification failed:', error.message);
      
      return {
        giid: giid,
        invoice_number: identity.invoice_number,
        integrity: 'ERROR',
        error: error.message,
        stored_hash: storedHash,
        ipfs_cid: ipfsCid
      };
    }
  }
}

module.exports = { IdentityEngine };
