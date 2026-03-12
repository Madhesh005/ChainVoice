/**
 * Document Service
 * 
 * Handles invoice PDF fetching, hashing, and IPFS storage.
 * Integrates with Odoo for PDF generation and IPFS for storage.
 * 
 * Flow:
 * 1. Authenticate with Odoo (session-based)
 * 2. Fetch PDF from Odoo using session cookie
 * 3. Generate SHA-256 hash from binary
 * 4. Upload to IPFS
 * 5. Return document_hash and ipfs_cid
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const { IPFSService } = require('./ipfsService');

const ODOO_URL = process.env.ODOO_URL;
const ODOO_DB = process.env.ODOO_DB;
const ODOO_USERNAME = process.env.ODOO_USERNAME;
const ODOO_PASSWORD = process.env.ODOO_PASSWORD;

class DocumentService {
  constructor() {
    this.ipfsService = new IPFSService();
    this.sessionCookie = null; // Cache session cookie
  }

  /**
   * Authenticate with Odoo and get session cookie
   * 
   * @returns {string} Session cookie string
   */
  async loginToOdoo() {
    try {
      console.log(`🔐 Authenticating with Odoo...`);
      console.log(`   URL: ${ODOO_URL}`);
      console.log(`   Database: ${ODOO_DB}`);
      console.log(`   Username: ${ODOO_USERNAME}`);

      const response = await axios.post(
        `${ODOO_URL}/web/session/authenticate`,
        {
          jsonrpc: '2.0',
          params: {
            db: ODOO_DB,
            login: ODOO_USERNAME,
            password: ODOO_PASSWORD
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Check if authentication was successful
      if (response.data && response.data.result && response.data.result.uid) {
        console.log(`   ✓ Authentication successful`);
        console.log(`   ✓ User ID: ${response.data.result.uid}`);
        
        // Extract session cookie from response headers
        const cookies = response.headers['set-cookie'];
        if (!cookies || cookies.length === 0) {
          throw new Error('No session cookie received from Odoo');
        }

        // Combine all cookies into a single string
        const sessionCookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        console.log(`   ✓ Session cookie obtained`);

        // Cache the session cookie
        this.sessionCookie = sessionCookie;

        return sessionCookie;

      } else {
        throw new Error('Authentication failed - no user ID returned');
      }

    } catch (error) {
      console.error('❌ Odoo authentication failed:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      throw new Error(`Failed to authenticate with Odoo: ${error.message}`);
    }
  }

  /**
   * Download invoice PDF from Odoo using authenticated session
   * 
   * @param {number} invoiceId - Odoo invoice ID
   * @param {string} sessionCookie - Session cookie from authentication
   * @returns {Buffer} PDF buffer
   */
  async downloadInvoicePDF(invoiceId, sessionCookie) {
    try {
      // Odoo PDF report endpoint
      const url = `${ODOO_URL}/report/pdf/account.report_invoice/${invoiceId}`;

      console.log(`📥 Downloading PDF from Odoo...`);
      console.log(`   URL: ${url}`);
      console.log(`   Invoice ID: ${invoiceId}`);
      console.log(`   Using session cookie: ${sessionCookie ? 'Yes' : 'No'}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer', // CRITICAL: Binary mode
        headers: {
          'Cookie': sessionCookie,
          'Accept': 'application/pdf'
        },
        timeout: 30000, // 30 second timeout
        maxRedirects: 0 // Don't follow redirects (would redirect to login if not authenticated)
      });

      // Step 1: Validate Content-Type header
      const contentType = response.headers['content-type'];
      console.log(`   ✓ Content-Type: ${contentType}`);

      if (contentType && !contentType.includes('application/pdf')) {
        console.error(`❌ Invalid Content-Type: ${contentType}`);
        console.error(`   Expected: application/pdf`);
        
        // If we got HTML, it's likely the login page
        if (contentType.includes('text/html')) {
          const htmlPreview = Buffer.from(response.data).slice(0, 200).toString('utf8');
          console.error(`   HTML response preview: ${htmlPreview}`);
          throw new Error('Odoo returned HTML instead of PDF - authentication may have failed');
        }
        
        throw new Error(`Invalid content type: ${contentType}. Expected application/pdf`);
      }

      // Step 2: Convert to Buffer
      const buffer = Buffer.from(response.data);
      console.log(`   ✓ PDF downloaded: ${buffer.length} bytes`);
      
      // Step 3: Validate PDF signature
      const signature = buffer.slice(0, 5).toString('ascii');
      console.log(`   ✓ File signature: ${signature}`);

      if (signature !== '%PDF-') {
        console.error(`❌ Invalid PDF signature: ${signature}`);
        console.error(`   Expected: %PDF-`);
        console.error(`   First 100 bytes: ${buffer.slice(0, 100).toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
        
        // Check if it's HTML
        const content = buffer.toString('utf8', 0, 100);
        if (content.includes('<!DOCTYPE') || content.includes('<html')) {
          throw new Error('Received HTML login page instead of PDF - session cookie invalid or expired');
        }
        
        throw new Error(`Invalid PDF file received (signature: ${signature}). File may be corrupted.`);
      }

      console.log(`   ✓ PDF signature validated: ${signature}`);
      console.log(`   ✓ PDF is valid and ready for processing`);

      return buffer;

    } catch (error) {
      console.error('❌ Failed to download PDF from Odoo:', error.message);
      
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response Content-Type:', error.response.headers['content-type']);
        
        // If we got HTML instead of PDF, show preview
        if (error.response.headers['content-type']?.includes('text/html')) {
          const htmlPreview = Buffer.from(error.response.data).slice(0, 300).toString('utf8');
          console.error('   HTML response preview:', htmlPreview);
        }
      }
      
      throw new Error(`Failed to download invoice PDF: ${error.message}`);
    }
  }

  /**
   * Fetch invoice PDF from Odoo (with authentication)
   * 
   * @param {number} invoiceId - Odoo invoice ID
   * @returns {Buffer} PDF buffer
   */
  async fetchInvoicePDF(invoiceId) {
    try {
      // Step 1: Authenticate with Odoo (or use cached session)
      let sessionCookie = this.sessionCookie;
      
      if (!sessionCookie) {
        sessionCookie = await this.loginToOdoo();
      }

      // Step 2: Download PDF using authenticated session
      try {
        return await this.downloadInvoicePDF(invoiceId, sessionCookie);
      } catch (error) {
        // If download fails, try re-authenticating (session might have expired)
        if (error.message.includes('Invalid PDF') || error.response?.status === 303 || error.response?.status === 401) {
          console.log(`   ⚠️  Session may have expired, re-authenticating...`);
          sessionCookie = await this.loginToOdoo();
          return await this.downloadInvoicePDF(invoiceId, sessionCookie);
        }
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to fetch PDF from Odoo:', error.message);
      throw new Error(`Failed to fetch invoice PDF: ${error.message}`);
    }
  }

  /**
   * Generate SHA-256 hash from binary buffer
   * 
   * @param {Buffer} buffer - File buffer
   * @returns {string} SHA-256 hash (hex)
   */
  generateDocumentHash(buffer) {
    // Validate input is a Buffer
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Input must be a Buffer for hash generation');
    }

    // Generate SHA-256 hash from raw binary (no encoding conversion)
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    console.log(`✓ Document hash generated: ${hash}`);
    console.log(`   Buffer size: ${buffer.length} bytes`);
    
    return hash;
  }

  /**
   * Store document: fetch PDF, hash, upload to IPFS
   * 
   * @param {string} giid - Global Invoice ID
   * @param {number} invoiceId - Odoo invoice ID
   * @param {string} invoiceNumber - Human-readable invoice number
   * @returns {Object} { document_hash, ipfs_cid, size }
   */
  async storeDocument(giid, invoiceId, invoiceNumber) {
    console.log(`\n📄 Starting document storage`);
    console.log(`   GIID: ${giid}`);
    console.log(`   Invoice ID: ${invoiceId}`);
    console.log(`   Invoice Number: ${invoiceNumber}`);

    // Step 1: Fetch PDF from Odoo (with authentication)
    console.log(`\n1️⃣  Fetching PDF from Odoo...`);
    const pdfBuffer = await this.fetchInvoicePDF(invoiceId);
    console.log(`   ✓ PDF fetched: ${pdfBuffer.length} bytes`);

    // Step 2: Generate SHA-256 hash from binary
    console.log(`\n2️⃣  Generating document hash...`);
    const documentHash = this.generateDocumentHash(pdfBuffer);
    console.log(`   ✓ Document Hash: ${documentHash}`);

    // Step 3: Upload to IPFS
    console.log(`\n3️⃣  Uploading to IPFS...`);
    
    if (!this.ipfsService.isConfigured()) {
      console.warn('   ⚠️  IPFS not configured (PINATA_JWT missing)');
      console.warn('   ⚠️  Returning hash without CID');
      return {
        document_hash: documentHash,
        ipfs_cid: null,
        size: pdfBuffer.length,
        warning: 'IPFS not configured'
      };
    }

    const filename = `invoice_${invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${giid.substring(0, 8)}.pdf`;
    const metadata = {
      giid: giid,
      invoice_id: invoiceId.toString(),
      invoice_number: invoiceNumber,
      document_hash: documentHash
    };

    const ipfsResult = await this.ipfsService.uploadFile(pdfBuffer, filename, metadata);

    console.log(`   ✓ IPFS Upload successful`);
    console.log(`   ✓ IPFS CID: ${ipfsResult.cid}`);
    console.log(`   ✓ Size: ${ipfsResult.size} bytes`);
    console.log(`   ✓ Gateway URL: ${this.getDocumentUrl(ipfsResult.cid)}`);

    return {
      document_hash: documentHash,
      ipfs_cid: ipfsResult.cid,
      size: ipfsResult.size,
      timestamp: ipfsResult.timestamp
    };
  }

  /**
   * Verify document integrity
   * 
   * @param {string} giid - Global Invoice ID
   * @param {string} storedHash - Stored document hash
   * @param {string} ipfsCid - IPFS CID
   * @returns {Object} { integrity: 'VALID' | 'TAMPERED' | 'NO_DOCUMENT', computed_hash, stored_hash }
   */
  async verifyDocument(giid, storedHash, ipfsCid) {
    try {
      if (!ipfsCid) {
        return {
          integrity: 'NO_DOCUMENT',
          message: 'No IPFS CID available for this invoice',
          stored_hash: storedHash
        };
      }

      if (!storedHash) {
        return {
          integrity: 'NO_HASH',
          message: 'No document hash stored for this invoice',
          ipfs_cid: ipfsCid
        };
      }

      console.log(`\n🔍 Verifying document integrity`);
      console.log(`   GIID: ${giid}`);
      console.log(`   IPFS CID: ${ipfsCid}`);
      console.log(`   Stored Hash: ${storedHash}`);

      // Download file from IPFS (binary mode, no string conversion)
      console.log(`\n📥 Downloading from IPFS gateway...`);
      const buffer = await this.ipfsService.downloadFile(ipfsCid);

      // Validate buffer is a Buffer instance
      if (!Buffer.isBuffer(buffer)) {
        throw new Error('Downloaded data is not a Buffer');
      }

      console.log(`   ✓ Downloaded: ${buffer.length} bytes`);
      console.log(`   ✓ Buffer type: ${buffer.constructor.name}`);

      // Validate PDF signature
      const pdfSignature = buffer.slice(0, 5).toString('ascii');
      if (pdfSignature !== '%PDF-') {
        throw new Error(`Invalid PDF signature: ${pdfSignature}`);
      }
      console.log(`   ✓ PDF signature validated: ${pdfSignature}`);

      // Compute SHA-256 hash from raw binary buffer
      console.log(`\n🔐 Computing SHA-256 hash from binary...`);
      const computedHash = this.generateDocumentHash(buffer);
      console.log(`   ✓ Computed Hash: ${computedHash}`);

      // Compare hashes
      const match = computedHash === storedHash;
      const integrity = match ? 'VALID' : 'TAMPERED';

      console.log(`\n📊 Verification Result:`);
      console.log(`   Stored Hash:   ${storedHash}`);
      console.log(`   Computed Hash: ${computedHash}`);
      console.log(`   Match: ${match}`);
      console.log(`   Integrity: ${integrity}\n`);

      return {
        integrity: integrity,
        computed_hash: computedHash,
        stored_hash: storedHash,
        ipfs_cid: ipfsCid,
        match: match,
        gateway_url: this.getDocumentUrl(ipfsCid),
        file_size: buffer.length,
        pdf_signature: pdfSignature
      };

    } catch (error) {
      console.error('\n❌ Document verification failed:', error.message);
      console.error('   Stack:', error.stack);
      
      return {
        integrity: 'ERROR',
        error: error.message,
        stored_hash: storedHash,
        ipfs_cid: ipfsCid
      };
    }
  }

  /**
   * Get IPFS gateway URL for document
   * 
   * @param {string} ipfsCid - IPFS CID
   * @returns {string} Gateway URL
   */
  getDocumentUrl(ipfsCid) {
    return this.ipfsService.getGatewayUrl(ipfsCid);
  }

  /**
   * Check if document service is fully configured
   * 
   * @returns {boolean}
   */
  isConfigured() {
    return !!(ODOO_URL && ODOO_USERNAME && ODOO_PASSWORD && this.ipfsService.isConfigured());
  }
}

module.exports = { DocumentService };
