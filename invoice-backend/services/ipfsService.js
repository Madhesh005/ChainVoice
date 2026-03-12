/**
 * IPFS Service (Pinata Integration)
 * 
 * Handles file uploads and downloads to/from IPFS via Pinata.
 * Uses JWT authentication (no API key/secret exposure).
 * 
 * Download Strategy:
 * - Multi-gateway fallback for reliability
 * - Strict PDF signature validation
 * - Binary-only processing (no HTML/JSON parsing)
 * 
 * Security:
 * - JWT loaded from environment
 * - No secrets in logs or responses
 * - Graceful error handling
 */

require('dotenv').config();
const FormData = require('form-data');
const axios = require('axios');

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_JWT = process.env.PINATA_JWT;

// Multi-gateway fallback system for production-grade reliability
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/'
];   

class IPFSService {
  constructor() {
    if (!PINATA_JWT) {
      console.warn('⚠️  PINATA_JWT not configured. IPFS uploads will fail.');
    }
  }

  /**
   * Upload file to IPFS via Pinata
   * 
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Original filename
   * @param {Object} metadata - Optional metadata (keyvalues)
   * @returns {Object} { cid, size, timestamp }
   */
  async uploadFile(buffer, filename, metadata = {}) {
    if (!PINATA_JWT) {
      throw new Error('PINATA_JWT not configured');
    }

    try {
      const formData = new FormData();
      
      // Add file
      formData.append('file', buffer, {
        filename: filename,
        contentType: 'application/pdf'
      });

      // Add metadata - ensure all values are strings or numbers
      const sanitizedMetadata = {};
      for (const [key, value] of Object.entries(metadata)) {
        if (typeof value === 'string' || typeof value === 'number') {
          sanitizedMetadata[key] = value;
        } else {
          sanitizedMetadata[key] = String(value);
        }
      }

      const pinataMetadata = {
        name: filename,
        keyvalues: {
          ...sanitizedMetadata,
          uploaded_at: new Date().toISOString()
        }
      };
      formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

      // Add pinata options (optional)
      const pinataOptions = {
        cidVersion: 1
      };
      formData.append('pinataOptions', JSON.stringify(pinataOptions));

      // Upload to Pinata
      const response = await axios.post(
        `${PINATA_API_URL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${PINATA_JWT}`,
            ...formData.getHeaders()
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        }
      );

      console.log(`✓ File uploaded to IPFS: ${response.data.IpfsHash}`);

      return {
        cid: response.data.IpfsHash,
        size: response.data.PinSize,
        timestamp: response.data.Timestamp
      };

    } catch (error) {
      console.error('❌ IPFS upload failed:', error.message);
      
      // Don't expose sensitive error details
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Download file from IPFS with multi-gateway fallback
   * 
   * Production-grade retrieval system:
   * - Tries multiple gateways sequentially
   * - Validates PDF signature (not HTTP headers)
   * - Returns Buffer only when valid PDF found
   * - Automatic fallback on failure
   * 
   * @param {string} cid - IPFS CID
   * @returns {Buffer} File buffer (validated PDF)
   */
  async downloadFile(cid) {
    console.log(`\n[IPFS] Starting multi-gateway download for CID: ${cid}`);
    
    const errors = [];

    // Try each gateway sequentially
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      const gateway = IPFS_GATEWAYS[i];
      const url = `${gateway}${cid}`;
      
      try {
        console.log(`[IPFS] Trying gateway ${i + 1}/${IPFS_GATEWAYS.length}: ${gateway}`);
        
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'arraybuffer',  // CRITICAL: Binary mode only
          timeout: 20000, // 20 second timeout
          maxRedirects: 5, // Allow redirects for gateway flexibility
          validateStatus: (status) => status === 200,  // Only accept 200 OK
          headers: {
            'Accept': 'application/pdf, application/octet-stream, */*'
          }
        });

        console.log(`[IPFS] Response received from ${gateway}`);
        console.log(`[IPFS]   Status: ${response.status}`);
        console.log(`[IPFS]   Content-Type: ${response.headers['content-type'] || 'unknown'}`);
        console.log(`[IPFS]   Content-Length: ${response.headers['content-length'] || 'unknown'}`);

        // Convert to Buffer (binary only, no string conversion)
        const buffer = Buffer.from(response.data);
        console.log(`[IPFS]   Downloaded: ${buffer.length} bytes`);

        // STRICT VALIDATION: Check PDF signature (ignore HTTP headers)
        const signature = buffer.slice(0, 5).toString('ascii');
        console.log(`[IPFS]   File signature: ${signature}`);

        if (!signature.startsWith('%PDF-')) {
          console.log(`[IPFS] ❌ Invalid PDF signature from ${gateway}`);
          console.log(`[IPFS]   Expected: %PDF-`);
          console.log(`[IPFS]   Got: ${signature}`);
          console.log(`[IPFS]   First 50 bytes (hex): ${buffer.slice(0, 50).toString('hex')}`);
          
          // Check if we got HTML/JSON instead
          const contentStart = buffer.slice(0, 100).toString('ascii').replace(/[^\x20-\x7E]/g, '.');
          if (contentStart.includes('<html') || contentStart.includes('<!DOCTYPE') || contentStart.includes('{')) {
            console.log(`[IPFS]   Gateway returned HTML/JSON wrapper instead of raw file`);
          }
          
          errors.push(`${gateway}: Invalid PDF signature (got: ${signature})`);
          continue; // Try next gateway
        }

        // Valid PDF found!
        console.log(`[IPFS] ✅ PDF signature valid: ${signature}`);
        console.log(`[IPFS] ✅ Using gateway: ${gateway}`);
        console.log(`[IPFS] ✅ Successfully downloaded valid PDF: ${buffer.length} bytes\n`);

        return buffer;

      } catch (error) {
        console.log(`[IPFS] ❌ Gateway failed: ${gateway}`);
        console.log(`[IPFS]   Error: ${error.message}`);
        
        if (error.response) {
          console.log(`[IPFS]   Response status: ${error.response.status}`);
          console.log(`[IPFS]   Response Content-Type: ${error.response.headers['content-type']}`);
        }
        
        errors.push(`${gateway}: ${error.message}`);
        
        // Continue to next gateway
        if (i < IPFS_GATEWAYS.length - 1) {
          console.log(`[IPFS] Trying next gateway...`);
        }
      }
    }

    // All gateways failed
    console.error(`\n[IPFS] ❌ All gateways failed for CID: ${cid}`);
    console.error(`[IPFS] Attempted gateways:`);
    errors.forEach((err, idx) => {
      console.error(`[IPFS]   ${idx + 1}. ${err}`);
    });
    console.error('');

    throw new Error(`Failed to download valid PDF from all IPFS gateways. Tried ${IPFS_GATEWAYS.length} gateways.`);
  }

  /**
   * Get file URL from authenticated Pinata gateway
   * 
   * Note: This URL requires JWT authentication to access
   * 
   * @param {string} cid - IPFS CID
   * @returns {string} Gateway URL
   */
  getGatewayUrl(cid) {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  /**
   * Check if IPFS service is configured
   * 
   * @returns {boolean}
   */
  isConfigured() {
    return !!PINATA_JWT;
  }

  /**
   * Test connection to Pinata
   * 
   * @returns {boolean} true if connection successful
   */
  async testConnection() {
    if (!PINATA_JWT) {
      return false;
    }

    try {
      const response = await axios.get(
        `${PINATA_API_URL}/data/testAuthentication`,
        {
          headers: {
            'Authorization': `Bearer ${PINATA_JWT}`
          }
        }
      );

      console.log('✓ Pinata connection successful:', response.data.message);
      return true;

    } catch (error) {
      console.error('❌ Pinata connection failed:', error.message);
      return false;
    }
  }
}

module.exports = { IPFSService };
