/**
 * ERP Factory
 * Creates appropriate ERP provider based on type
 * Extensible to support multiple ERP systems
 */

const OdooProvider = require('./providers/odooProvider');

class ERPFactory {
  /**
   * Create ERP provider instance
   * @param {string} erpType - Type of ERP (odoo, zoho, sap, tally)
   * @param {object} config - ERP configuration
   */
  static createProvider(erpType, config) {
    switch (erpType.toLowerCase()) {
      case 'odoo':
        return new OdooProvider(config);

      // Future ERP providers can be added here
      case 'zoho':
        throw new Error('Zoho provider not yet implemented');

      case 'sap':
        throw new Error('SAP provider not yet implemented');

      case 'tally':
        throw new Error('Tally provider not yet implemented');

      default:
        throw new Error(`Unsupported ERP type: ${erpType}`);
    }
  }

  /**
   * Get list of supported ERP types
   */
  static getSupportedERPs() {
    return [
      {
        type: 'odoo',
        name: 'Odoo',
        status: 'active',
        description: 'Open-source ERP system',
      },
      {
        type: 'zoho',
        name: 'Zoho Books',
        status: 'planned',
        description: 'Cloud-based accounting software',
      },
      {
        type: 'sap',
        name: 'SAP Business One',
        status: 'planned',
        description: 'Enterprise resource planning',
      },
      {
        type: 'tally',
        name: 'Tally ERP',
        status: 'planned',
        description: 'Popular accounting software in India',
      },
    ];
  }

  /**
   * Validate ERP configuration
   */
  static validateConfig(erpType, config) {
    const requiredFields = {
      odoo: ['baseUrl', 'database', 'username', 'password'],
      zoho: ['organizationId', 'clientId', 'clientSecret', 'refreshToken'],
      sap: ['baseUrl', 'companyDB', 'username', 'password'],
      tally: ['baseUrl', 'companyName', 'username', 'password'],
    };

    const required = requiredFields[erpType.toLowerCase()];
    if (!required) {
      throw new Error(`Unknown ERP type: ${erpType}`);
    }

    const missing = required.filter((field) => !config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    return true;
  }
}

module.exports = ERPFactory;
