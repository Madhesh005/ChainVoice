/**
 * Encryption Utility
 * Handles encryption/decryption of sensitive data (ERP passwords)
 */

const CryptoJS = require('crypto-js');

// Use environment variable for encryption key in production
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-secret-encryption-key-change-in-production';

class EncryptionUtil {
  /**
   * Encrypt text using AES
   */
  static encrypt(text) {
    if (!text) return null;
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  }

  /**
   * Decrypt text using AES
   */
  static decrypt(encryptedText) {
    if (!encryptedText) return null;
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Generate SHA-256 hash
   */
  static hash(text) {
    return CryptoJS.SHA256(text).toString();
  }

  /**
   * Generate hash of normalized invoice data
   */
  static hashInvoiceData(invoiceData) {
    // Create deterministic string from invoice data
    const dataString = JSON.stringify({
      invoice_number: invoiceData.invoice_number,
      invoice_date: invoiceData.invoice_date,
      buyer_name: invoiceData.buyer_name,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
    });
    return this.hash(dataString);
  }
}

module.exports = EncryptionUtil;
