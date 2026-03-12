/**
 * Lender Mapping Utility
 * Maps lender email addresses to their identifiers
 */

/**
 * Map lender email to lender identifier
 * @param {string} email - Lender email address
 * @returns {string|null} - Lender identifier or null if not found
 */
function mapEmailToLenderIdentifier(email) {
  const lenderMap = {
    // Production lender emails
    'hdfc@bank.com': 'HDFC_BANK',
    'axis@bank.com': 'AXIS_BANK',
    'bajaj@finance.com': 'BAJAJ_FINSERV',
    'shriram@finance.com': 'SHRIRAM_FINANCE',
    'muthoot@finance.com': 'MUTHOOT_FINANCE',
    
    // Development/test emails (based on current database)
    'hdfc@gmail.com': 'HDFC_BANK',
    'axis@gmail.com': 'AXIS_BANK',
    'bajaj@gmail.com': 'BAJAJ_FINSERV',
    'shriram@gmail.com': 'SHRIRAM_FINANCE',
    'muthoot@gmail.com': 'MUTHOOT_FINANCE',
    
    // Additional test patterns
    'lender1772984404321@bank.com': 'HDFC_BANK', // Default test lender to HDFC
  };

  return lenderMap[email] || null;
}

/**
 * Get lender name from identifier
 * @param {string} lenderIdentifier - Lender identifier
 * @returns {string} - Human readable lender name
 */
function getLenderName(lenderIdentifier) {
  const nameMap = {
    'HDFC_BANK': 'HDFC Bank',
    'AXIS_BANK': 'Axis Bank',
    'BAJAJ_FINSERV': 'Bajaj Finserv',
    'SHRIRAM_FINANCE': 'Shriram Finance',
    'MUTHOOT_FINANCE': 'Muthoot Finance',
  };

  return nameMap[lenderIdentifier] || lenderIdentifier;
}

/**
 * Validate lender identifier
 * @param {string} lenderIdentifier - Lender identifier to validate
 * @returns {boolean} - True if valid lender identifier
 */
function isValidLenderIdentifier(lenderIdentifier) {
  const validIdentifiers = [
    'HDFC_BANK',
    'AXIS_BANK',
    'BAJAJ_FINSERV',
    'SHRIRAM_FINANCE',
    'MUTHOOT_FINANCE'
  ];

  return validIdentifiers.includes(lenderIdentifier);
}

module.exports = {
  mapEmailToLenderIdentifier,
  getLenderName,
  isValidLenderIdentifier
};