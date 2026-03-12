/**
 * Odoo ERP Provider
 * Handles communication with Odoo via XML-RPC
 */

const xmlrpc = require('xmlrpc');

class OdooProvider {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.database = config.database;
    this.username = config.username;
    this.password = config.password;
    this.uid = null;

    // Parse URL to get host and port
    const url = new URL(this.baseUrl);
    this.host = url.hostname;
    this.port = url.port || (url.protocol === 'https:' ? 443 : 80);
    this.protocol = url.protocol === 'https:' ? 'https' : 'http';
  }

  /**
   * Authenticate with Odoo
   * Returns user ID if successful
   */
  async authenticate() {
    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({
        host: this.host,
        port: this.port,
        path: '/xmlrpc/2/common',
      });

      client.methodCall(
        'authenticate',
        [this.database, this.username, this.password, {}],
        (error, uid) => {
          if (error) {
            reject(new Error(`Odoo authentication failed: ${error.message}`));
          } else if (!uid) {
            reject(new Error('Odoo authentication failed: Invalid credentials'));
          } else {
            this.uid = uid;
            resolve(uid);
          }
        }
      );
    });
  }

  /**
   * Execute Odoo method
   */
  async execute(model, method, args, kwargs = {}) {
    if (!this.uid) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      const client = xmlrpc.createClient({
        host: this.host,
        port: this.port,
        path: '/xmlrpc/2/object',
      });

      const params = [
        this.database,
        this.uid,
        this.password,
        model,
        method,
        args,
        kwargs,
      ];

      client.methodCall('execute_kw', params, (error, result) => {
        if (error) {
          reject(new Error(`Odoo execute failed: ${error.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Fetch invoices from Odoo
   * @param {Date} lastSyncDate - Fetch invoices modified after this date
   */
  async fetchInvoices(lastSyncDate = null) {
    try {
      // Build domain filter
      const domain = [['move_type', '=', 'out_invoice']];

      if (lastSyncDate) {
        domain.push(['write_date', '>', lastSyncDate.toISOString()]);
      }

      // Fields to fetch
      const fields = [
        'id',
        'name',
        'invoice_date',
        'amount_total',
        'amount_untaxed',
        'amount_tax',
        'partner_id',
        'company_id',
        'state',
        'currency_id',
        'invoice_line_ids',
        'create_date',
        'write_date',
      ];

      // Search and read invoices
      const invoices = await this.execute(
        'account.move',
        'search_read',
        [domain],
        {
          fields: fields,
          order: 'invoice_date desc',
        }
      );

      console.log(`✓ Fetched ${invoices.length} invoices from Odoo`);

      // Fetch partner details for each invoice
      const enrichedInvoices = await Promise.all(
        invoices.map(async (invoice) => {
          try {
            // Get partner (buyer) details
            const partnerId = Array.isArray(invoice.partner_id)
              ? invoice.partner_id[0]
              : invoice.partner_id;

            const partnerData = await this.execute(
              'res.partner',
              'read',
              [[partnerId]],
              { fields: ['name', 'vat', 'email', 'phone'] }
            );

            // Get company (seller) details
            const companyId = Array.isArray(invoice.company_id)
              ? invoice.company_id[0]
              : invoice.company_id;

            const companyData = await this.execute(
              'res.company',
              'read',
              [[companyId]],
              { fields: ['name', 'vat'] }
            );

            return {
              ...invoice,
              partner_details: partnerData[0] || {},
              company_details: companyData[0] || {},
            };
          } catch (error) {
            console.error(`Error enriching invoice ${invoice.id}:`, error.message);
            return invoice;
          }
        })
      );

      return enrichedInvoices;
    } catch (error) {
      console.error('Error fetching invoices from Odoo:', error);
      throw error;
    }
  }

  /**
   * Fetch single invoice by ID
   */
  async fetchInvoiceById(invoiceId) {
    try {
      const invoices = await this.execute(
        'account.move',
        'read',
        [[invoiceId]],
        {
          fields: [
            'id',
            'name',
            'invoice_date',
            'amount_total',
            'amount_untaxed',
            'amount_tax',
            'partner_id',
            'company_id',
            'state',
            'currency_id',
            'invoice_line_ids',
          ],
        }
      );

      if (!invoices || invoices.length === 0) {
        throw new Error(`Invoice ${invoiceId} not found in Odoo`);
      }

      return invoices[0];
    } catch (error) {
      console.error(`Error fetching invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Map raw Odoo invoice to normalized format
   */
  mapInvoice(rawInvoice) {
    // Extract partner name
    const partnerName = Array.isArray(rawInvoice.partner_id)
      ? rawInvoice.partner_id[1]
      : rawInvoice.partner_details?.name || 'Unknown';

    // Extract company (seller) name
    const companyName = Array.isArray(rawInvoice.company_id)
      ? rawInvoice.company_id[1]
      : rawInvoice.company_details?.name || 'Unknown';

    // Extract currency
    const currency = Array.isArray(rawInvoice.currency_id)
      ? rawInvoice.currency_id[1]
      : 'INR';

    // Extract GSTINs
    const buyerGstin = rawInvoice.partner_details?.vat?.trim() || null;
    const sellerGstin = rawInvoice.company_details?.vat?.trim() || null;

    // Map Odoo state to our status
    const statusMap = {
      draft: 'draft',
      posted: 'posted',
      cancel: 'cancelled',
    };

    return {
      erp_invoice_id: String(rawInvoice.id),
      invoice_number: rawInvoice.name || `INV-${rawInvoice.id}`,
      invoice_date: rawInvoice.invoice_date || new Date().toISOString().split('T')[0],
      buyer_name: partnerName,
      buyer_gstin: buyerGstin,
      seller_name: companyName,
      seller_gstin: sellerGstin,
      amount: parseFloat(rawInvoice.amount_total) || 0,
      currency: currency.includes('INR') ? 'INR' : currency,
      status: statusMap[rawInvoice.state] || 'draft',
      raw_data: rawInvoice,
    };
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      const uid = await this.authenticate();
      return {
        success: true,
        uid: uid,
        message: 'Successfully connected to Odoo',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Download invoice PDF
   * @param {number} invoiceId - Odoo invoice ID
   * @returns {Buffer} PDF buffer
   */
  async downloadInvoicePDF(invoiceId) {
    const DocumentService = require('../../services/documentService');
    const documentService = new DocumentService({
      baseUrl: this.baseUrl,
      database: this.database,
      username: this.username,
      password: this.password,
    });

    return await documentService.fetchInvoicePDF(invoiceId);
  }

  /**
   * Get ERP info
   */
  getInfo() {
    return {
      type: 'odoo',
      baseUrl: this.baseUrl,
      database: this.database,
      username: this.username,
    };
  }
}

module.exports = OdooProvider;
