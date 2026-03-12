import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getInvoices, syncInvoices, getERPConnections } from '../../utils/api';

interface Invoice {
  id: number;
  invoice_number: string;
  buyer_name: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  giid: string | null;
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isERPConnected, setIsERPConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    checkERPConnectionAndFetchInvoices();
  }, []);

  const checkERPConnectionAndFetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if ERP is connected
      const connectionResponse = await getERPConnections();
      
      if (connectionResponse.success) {
        const connections = (connectionResponse as any).connections || [];
        const activeConnection = connections.find((conn: any) => conn.is_active);
        
        if (activeConnection) {
          setIsERPConnected(true);
          // Only fetch invoices if ERP is connected
          await fetchInvoices();
        } else {
          // ERP not connected - clear invoices
          setIsERPConnected(false);
          setInvoices([]);
        }
      } else {
        // Failed to check connection - assume not connected
        setIsERPConnected(false);
        setInvoices([]);
      }
    } catch (err: any) {
      console.error('Error checking ERP connection:', err);
      setIsERPConnected(false);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await getInvoices();
      
      if (response.success) {
        // Filter only posted invoices
        const allInvoices = (response as any).invoices || [];
        const postedInvoices = allInvoices.filter((invoice: Invoice) => 
          invoice.status.toLowerCase() === 'posted'
        );
        setInvoices(postedInvoices);
      } else {
        setError(response.message || 'Failed to load invoices');
        setInvoices([]);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading invoices');
      setInvoices([]);
    }
  };

  const handleSyncERP = async () => {
    if (!isERPConnected) {
      setError('Please connect your ERP first');
      return;
    }

    try {
      setSyncing(true);
      setError('');
      setSuccess('');
      
      const response = await syncInvoices('odoo');
      
      if (response.success) {
        const newCount = (response as any).total_new_invoices || 0;
        setSuccess(`Successfully synced ${newCount} new invoice${newCount !== 1 ? 's' : ''} from ERP`);
        // Refresh invoice list after sync
        setTimeout(() => {
          fetchInvoices();
          setSuccess('');
        }, 2000);
      } else {
        setError(response.message || 'Failed to sync invoices');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while syncing');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'draft': 'badge-warning',
      'posted': 'badge-info',
      'verified': 'badge-success',
      'financed': 'badge-success',
      'rejected': 'badge-error',
    };
    return badges[status.toLowerCase()] || 'badge-warning';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${amount.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <DashboardLayout role="msme">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">My Invoices</h1>
            <p className="text-gray-400">
              {isERPConnected 
                ? 'Track and manage all your posted invoices from ERP'
                : 'Connect your ERP to view invoices'}
            </p>
          </div>
          {isERPConnected && (
            <div className="flex space-x-3">
              <button
                onClick={handleSyncERP}
                disabled={syncing}
                className="btn-secondary flex items-center space-x-2"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync ERP</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-emerald-400">
            {success}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-cyan mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-400">Checking ERP connection...</p>
              </div>
            </div>
          </div>
        ) : !isERPConnected ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-amber/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">ERP Not Connected</h3>
              <p className="text-gray-400 mb-6">
                You need to connect your ERP system to view and manage invoices.
              </p>
              <div className="flex justify-center space-x-3">
                <Link to="/msme/erp-connection" className="btn-primary">
                  Connect ERP
                </Link>
                <button
                  onClick={checkERPConnectionAndFetchInvoices}
                  className="btn-secondary"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">No Posted Invoices Found</h3>
              <p className="text-gray-400 mb-6">
                Sync your ERP to fetch posted invoices from Odoo.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleSyncERP}
                  disabled={syncing}
                  className="btn-primary"
                >
                  {syncing ? 'Syncing...' : 'Sync ERP'}
                </button>
                <Link to="/msme/erp-connection" className="btn-secondary">
                  ERP Settings
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-lighter">
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Buyer</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">GIID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-navy-lighter hover:bg-navy-lighter transition-colors">
                      <td className="py-4 px-4 font-mono">{inv.invoice_number}</td>
                      <td className="py-4 px-4">{inv.buyer_name}</td>
                      <td className="py-4 px-4 font-mono font-bold">
                        {formatAmount(inv.amount, inv.currency)}
                      </td>
                      <td className="py-4 px-4 text-gray-400">{formatDate(inv.invoice_date)}</td>
                      <td className="py-4 px-4 font-mono text-xs text-gray-400">
                        {inv.giid ? inv.giid.substring(0, 12) + '...' : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={getStatusBadge(inv.status)}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <Link to={`/msme/invoices/${inv.id}`} className="text-cyan hover:underline">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
