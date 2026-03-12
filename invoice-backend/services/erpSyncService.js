/**
 * ERP Sync Service
 * Handles synchronization of invoices from ERP systems
 */

const ERPFactory = require('../erp/erpFactory');
const ERPConnectionModel = require('../models/erpConnection.model');
const InvoiceModel = require('../models/invoice.model');
const EncryptionUtil = require('../utils/encryption');

class ERPSyncService {
  /**
   * Sync invoices for a specific MSME
   * @param {string} msmeId - MSME identifier
   * @param {string} erpType - Type of ERP (optional, syncs all if not specified)
   */
  static async syncInvoices(msmeId, erpType = null) {
    try {
      console.log(`\n🔄 Starting invoice sync for MSME: ${msmeId}`);

      // Get ERP connections
      let connections;
      if (erpType) {
        const connection = await ERPConnectionModel.findByMSMEAndType(msmeId, erpType);
        connections = connection ? [connection] : [];
      } else {
        connections = await ERPConnectionModel.findByMSME(msmeId);
      }

      if (connections.length === 0) {
        throw new Error('No active ERP connections found');
      }

      const results = [];

      // Sync each connection
      for (const connection of connections) {
        try {
          console.log(`\n📡 Syncing ${connection.erp_type} connection (ID: ${connection.id})`);

          // Update status to syncing
          await ERPConnectionModel.updateSyncStatus(connection.id, 'syncing');

          // Decrypt password
          const password = EncryptionUtil.decrypt(connection.encrypted_password);

          // Create provider
          const provider = ERPFactory.createProvider(connection.erp_type, {
            baseUrl: connection.base_url,
            database: connection.database,
            username: connection.username,
            password: password,
          });

          // Fetch invoices (only new/updated since last sync)
          const lastSyncDate = connection.last_sync_at
            ? new Date(connection.last_sync_at)
            : null;

          const rawInvoices = await provider.fetchInvoices(lastSyncDate);
          console.log(`   ✓ Fetched ${rawInvoices.length} invoices from ERP`);

          // Normalize and store invoices
          const syncedInvoices = [];
          let newInvoicesCount = 0;
          let updatedInvoicesCount = 0;

          for (const rawInvoice of rawInvoices) {
            try {
              // Map to normalized format
              const normalizedInvoice = provider.mapInvoice(rawInvoice);

              // Generate hash
              const hash = EncryptionUtil.hashInvoiceData(normalizedInvoice);

              // Check if invoice already exists
              const existingInvoice = await InvoiceModel.findByMSME(msmeId, {
                erp_invoice_id: normalizedInvoice.erp_invoice_id,
                erp_connection_id: connection.id
              });

              const isNew = !existingInvoice || existingInvoice.length === 0;

              // Prepare invoice data
              const invoiceData = {
                msme_id: msmeId,
                erp_connection_id: connection.id,
                ...normalizedInvoice,
                normalized_hash: hash,
              };

              // Upsert invoice
              const savedInvoice = await InvoiceModel.upsert(invoiceData);
              syncedInvoices.push(savedInvoice);

              if (isNew) {
                newInvoicesCount++;
              } else {
                updatedInvoicesCount++;
              }
            } catch (error) {
              console.error(`   ❌ Error processing invoice ${rawInvoice.id}:`, error.message);
            }
          }

          console.log(`   ✓ Synced ${syncedInvoices.length} invoices to database`);
          console.log(`   ✓ New: ${newInvoicesCount}, Updated: ${updatedInvoicesCount}`);

          // Update last sync timestamp
          await ERPConnectionModel.updateLastSync(connection.id, 'success');

          // Log activity if new invoices were synced
          if (newInvoicesCount > 0) {
            const ActivityModel = require('../models/activity.model');
            try {
              await ActivityModel.logActivity({
                msme_id: msmeId,
                activity_type: 'erp_synced',
                activity_title: 'ERP Sync Completed',
                activity_description: `Successfully synced ${newInvoicesCount} new invoice${newInvoicesCount !== 1 ? 's' : ''} from ${connection.erp_type.toUpperCase()}`,
                metadata: {
                  erp_type: connection.erp_type,
                  new_count: newInvoicesCount,
                  updated_count: updatedInvoicesCount,
                  total_count: syncedInvoices.length,
                },
              });
              console.log(`   ✅ Activity logged for ERP sync`);
            } catch (activityError) {
              console.warn('   ⚠️  Warning: Failed to log activity:', activityError.message);
              // Continue even if activity logging fails
            }
          }

          results.push({
            connection_id: connection.id,
            erp_type: connection.erp_type,
            success: true,
            invoices_fetched: rawInvoices.length,
            invoices_synced: syncedInvoices.length,
            new_invoices: newInvoicesCount,
            updated_invoices: updatedInvoicesCount,
          });
        } catch (error) {
          console.error(`   ❌ Sync failed for connection ${connection.id}:`, error.message);

          // Update sync status with error
          await ERPConnectionModel.updateLastSync(connection.id, 'failed', error.message);

          results.push({
            connection_id: connection.id,
            erp_type: connection.erp_type,
            success: false,
            error: error.message,
          });
        }
      }

      console.log(`\n✅ Sync completed for MSME: ${msmeId}`);

      // Calculate total new invoices across all connections
      const totalNewInvoices = results.reduce((sum, r) => sum + (r.new_invoices || 0), 0);

      return {
        success: true,
        msme_id: msmeId,
        connections_synced: results.length,
        total_new_invoices: totalNewInvoices,
        results: results,
      };
    } catch (error) {
      console.error(`\n❌ Sync failed for MSME ${msmeId}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync single invoice by ERP invoice ID
   */
  static async syncSingleInvoice(msmeId, erpType, erpInvoiceId) {
    try {
      console.log(`\n🔄 Syncing single invoice: ${erpInvoiceId}`);

      // Get ERP connection
      const connection = await ERPConnectionModel.findByMSMEAndType(msmeId, erpType);
      if (!connection) {
        throw new Error(`No ${erpType} connection found for MSME ${msmeId}`);
      }

      // Decrypt password
      const password = EncryptionUtil.decrypt(connection.encrypted_password);

      // Create provider
      const provider = ERPFactory.createProvider(connection.erp_type, {
        baseUrl: connection.base_url,
        database: connection.database,
        username: connection.username,
        password: password,
      });

      // Fetch single invoice
      const rawInvoice = await provider.fetchInvoiceById(erpInvoiceId);

      // Map to normalized format
      const normalizedInvoice = provider.mapInvoice(rawInvoice);

      // Generate hash
      const hash = EncryptionUtil.hashInvoiceData(normalizedInvoice);

      // Prepare invoice data
      const invoiceData = {
        msme_id: msmeId,
        erp_connection_id: connection.id,
        ...normalizedInvoice,
        normalized_hash: hash,
      };

      // Upsert invoice
      const savedInvoice = await InvoiceModel.upsert(invoiceData);

      console.log(`✅ Invoice synced: ${savedInvoice.invoice_number}`);

      return savedInvoice;
    } catch (error) {
      console.error(`❌ Failed to sync invoice ${erpInvoiceId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get sync status for MSME
   */
  static async getSyncStatus(msmeId) {
    const connections = await ERPConnectionModel.findByMSME(msmeId);

    return connections.map((conn) => ({
      connection_id: conn.id,
      erp_type: conn.erp_type,
      last_sync_at: conn.last_sync_at,
      sync_status: conn.sync_status,
      last_error: conn.last_error,
      is_active: conn.is_active,
    }));
  }
}

module.exports = ERPSyncService;
