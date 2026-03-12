/**
 * Layer-5 Verification Engine
 * 
 * Provides cryptographic verification of invoice integrity by:
 * 1. Fetching invoice record from Fabric ledger
 * 2. Downloading PDF from IPFS using ipfs_cid
 * 3. Computing SHA-256 hash from downloaded file
 * 4. Comparing computed hash with ledger document_hash
 * 5. Recomputing binding hash: SHA256(GIID + document_hash)
 * 6. Comparing with ledger binding_hash
 * 
 * This is NOT a simple database lookup - it's cryptographic proof.
 */

const crypto = require('crypto');
const axios = require('axios');

class VerificationEngine {
  constructor(ledgerService, ipfsService) {
    this.ledgerService = ledgerService;
    this.ipfsService = ipfsService;
  }

  /**
   * Verify invoice integrity using cryptographic proof
   * 
   * @param {string} giid - Global Invoice ID
   * @returns {Object} Verification result with proof
   */
  async verifyInvoice(giid) {
    console.log(`\n[Layer5] Starting cryptographic verification for GIID: ${giid.substring(0, 32)}...`);
    
    const result = {
      giid: giid,
      ledger_verified: false,
      ipfs_reachable: false,
      document_hash_match: false,
      binding_hash_match: false,
      verification_result: 'FAILED',
      timestamp: new Date().toISOString()
    };

    try {
      // Step 1: Fetch invoice record from ledger
      console.log('[Layer5] Step 1: Fetching invoice from ledger...');
      const ledgerRecord = await this.ledgerService.verifyInvoice(giid);

      if (!ledgerRecord.found) {
        console.log('[Layer5] ❌ Invoice not found in ledger');
        result.reason = 'Invoice not found in ledger';
        return result;
      }

      result.ledger_verified = true;
      result.status = ledgerRecord.status;
      result.invoice_number = ledgerRecord.invoice_number;

      console.log(`[Layer5] ✓ Ledger record found`);
      console.log(`[Layer5]   Invoice Number: ${ledgerRecord.invoice_number}`);
      console.log(`[Layer5]   Status: ${ledgerRecord.status}`);
      console.log(`[Layer5]   Document Hash: ${ledgerRecord.document_hash?.substring(0, 32)}...`);
      console.log(`[Layer5]   Binding Hash: ${ledgerRecord.binding_hash?.substring(0, 32)}...`);
      console.log(`[Layer5]   IPFS CID: ${ledgerRecord.ipfs_cid}`);

      // Validate Layer-3 data exists
      if (!ledgerRecord.document_hash) {
        console.log('[Layer5] ❌ No document_hash in ledger record');
        result.reason = 'No document_hash in ledger record';
        return result;
      }

      if (!ledgerRecord.binding_hash) {
        console.log('[Layer5] ❌ No binding_hash in ledger record');
        result.reason = 'No binding_hash in ledger record';
        return result;
      }

      if (!ledgerRecord.ipfs_cid) {
        console.log('[Layer5] ❌ No ipfs_cid in ledger record');
        result.reason = 'No ipfs_cid in ledger record';
        return result;
      }

      result.ledger_document_hash = ledgerRecord.document_hash;
      result.ledger_binding_hash = ledgerRecord.binding_hash;
      result.ipfs_cid = ledgerRecord.ipfs_cid;

      // Step 2: Download PDF from IPFS
      console.log('[Layer5] Step 2: Downloading document from IPFS...');
      console.log(`[Layer5]   CID: ${ledgerRecord.ipfs_cid}`);

      let pdfBuffer;
      try {
        pdfBuffer = await this.ipfsService.downloadFile(ledgerRecord.ipfs_cid);
        result.ipfs_reachable = true;
        console.log(`[Layer5] ✓ Document downloaded: ${pdfBuffer.length} bytes`);
      } catch (error) {
        console.log(`[Layer5] ❌ Failed to download from IPFS: ${error.message}`);
        result.reason = `IPFS download failed: ${error.message}`;
        return result;
      }

      // Validate PDF signature
      const pdfSignature = pdfBuffer.slice(0, 5).toString('ascii');
      if (!pdfSignature.startsWith('%PDF-')) {
        console.log(`[Layer5] ❌ Invalid PDF signature: ${pdfSignature}`);
        result.reason = 'Downloaded file is not a valid PDF';
        return result;
      }
      console.log(`[Layer5] ✓ PDF signature validated: ${pdfSignature}`);

      // Step 3: Compute SHA-256 hash from downloaded file
      console.log('[Layer5] Step 3: Computing SHA-256 hash from downloaded file...');
      const computedHash = this.computeDocumentHash(pdfBuffer);
      result.computed_document_hash = computedHash;

      console.log(`[Layer5]   Computed Hash: ${computedHash}`);
      console.log(`[Layer5]   Ledger Hash:   ${ledgerRecord.document_hash}`);

      // Step 4: Compare computed hash with ledger document_hash
      if (computedHash === ledgerRecord.document_hash) {
        result.document_hash_match = true;
        console.log('[Layer5] ✓ Document hash MATCH');
      } else {
        console.log('[Layer5] ❌ Document hash MISMATCH');
        result.reason = 'Document hash mismatch - content has been tampered';
        return result;
      }

      // Step 5: Recompute binding hash
      console.log('[Layer5] Step 4: Verifying binding hash...');
      const computedBinding = this.computeBindingHash(giid, ledgerRecord.document_hash);
      result.computed_binding_hash = computedBinding;

      console.log(`[Layer5]   Computed Binding: ${computedBinding}`);
      console.log(`[Layer5]   Ledger Binding:   ${ledgerRecord.binding_hash}`);

      // Step 6: Compare with ledger binding_hash
      if (computedBinding === ledgerRecord.binding_hash) {
        result.binding_hash_match = true;
        console.log('[Layer5] ✓ Binding hash MATCH');
      } else {
        console.log('[Layer5] ❌ Binding hash MISMATCH');
        result.reason = 'Binding hash mismatch - cryptographic binding violated';
        return result;
      }

      // All checks passed
      result.verification_result = 'TRUSTED';
      result.file_size = pdfBuffer.length;
      result.pdf_signature = pdfSignature;

      console.log('\n[Layer5] ✅ VERIFICATION SUCCESSFUL - All checks passed');
      console.log('[Layer5]   Result: TRUSTED');
      console.log('[Layer5]   Ledger: ✓');
      console.log('[Layer5]   IPFS: ✓');
      console.log('[Layer5]   Document Hash: ✓');
      console.log('[Layer5]   Binding Hash: ✓\n');

      return result;

    } catch (error) {
      console.error(`[Layer5] ❌ Verification error: ${error.message}`);
      console.error(error.stack);
      
      result.reason = `Verification error: ${error.message}`;
      result.error = error.message;
      
      return result;
    }
  }

  /**
   * Compute SHA-256 hash from document buffer
   * 
   * @param {Buffer} buffer - Document buffer
   * @returns {string} SHA-256 hash (hex)
   */
  computeDocumentHash(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input must be a Buffer');
    }

    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Compute binding hash: SHA256(GIID + document_hash)
   * 
   * @param {string} giid - Global Invoice ID
   * @param {string} documentHash - Document SHA-256 hash
   * @returns {string} Binding hash (hex)
   */
  computeBindingHash(giid, documentHash) {
    if (!giid || !documentHash) {
      throw new Error('GIID and documentHash are required for binding');
    }

    return crypto.createHash('sha256').update(giid + documentHash).digest('hex');
  }

  /**
   * Verify multiple invoices in batch
   * 
   * @param {Array<string>} giids - Array of GIIDs
   * @returns {Array<Object>} Array of verification results
   */
  async verifyBatch(giids) {
    console.log(`[Layer5] Starting batch verification for ${giids.length} invoices`);
    
    const results = [];
    for (const giid of giids) {
      const result = await this.verifyInvoice(giid);
      results.push(result);
    }

    const trusted = results.filter(r => r.verification_result === 'TRUSTED').length;
    const failed = results.length - trusted;

    console.log(`[Layer5] Batch verification complete: ${trusted} TRUSTED, ${failed} FAILED`);

    return results;
  }

  /**
   * Get verification summary statistics
   * 
   * @param {Object} result - Verification result
   * @returns {Object} Summary statistics
   */
  getSummary(result) {
    return {
      giid: result.giid,
      result: result.verification_result,
      checks: {
        ledger: result.ledger_verified ? '✓' : '✗',
        ipfs: result.ipfs_reachable ? '✓' : '✗',
        document_hash: result.document_hash_match ? '✓' : '✗',
        binding_hash: result.binding_hash_match ? '✓' : '✗'
      },
      reason: result.reason || 'All checks passed'
    };
  }
}

module.exports = { VerificationEngine };
