import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getLenderInvoices } from '../../utils/api';

interface PipelineStats {
  pending_review: number;
  approved: number;
  disbursed: number;
  rejected: number;
}

interface PipelineInvoice {
  id: number;
  invoice_number: string;
  msme_company_name: string;
  amount: number;
  currency: string;
  request_date: string;
  request_status: string;
  giid: string;
}

export default function Pipeline() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PipelineStats>({
    pending_review: 0,
    approved: 0,
    disbursed: 0,
    rejected: 0
  });
  const [invoices, setInvoices] = useState<PipelineInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Get lender identifier from authenticated user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const lenderIdentifier = user.lender_identifier || 'HDFC_BANK';

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const fetchPipelineData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all lender invoices
      const response = await getLenderInvoices(lenderIdentifier);
      
      if (response.success) {
        const invoiceData = response.invoices || [];
        setInvoices(invoiceData);

        // Calculate stats from the data
        const stats = invoiceData.reduce((acc: PipelineStats, invoice: any) => {
          switch (invoice.request_status) {
            case 'PENDING':
              acc.pending_review++;
              break;
            case 'APPROVED':
              acc.approved++;
              break;
            case 'FINANCED':
              acc.disbursed++;
              break;
            case 'REJECTED':
              acc.rejected++;
              break;
          }
          return acc;
        }, { pending_review: 0, approved: 0, disbursed: 0, rejected: 0 });

        setStats(stats);
      }
    } catch (err: any) {
      console.error('Error fetching pipeline data:', err);
      setError(err.message || 'Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'INR'): string => {
    if (currency === 'INR') {
      if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(1)}L`;
      }
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending Review', className: 'badge-warning' },
      APPROVED: { label: 'Approved', className: 'badge-success' },
      FINANCED: { label: 'Financed', className: 'badge-info' },
      REJECTED: { label: 'Rejected', className: 'badge-error' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'badge-secondary' };
    return <span className={statusInfo.className}>{statusInfo.label}</span>;
  };

  const handleReviewClick = (invoice: PipelineInvoice) => {
    if (invoice.request_status === 'PENDING') {
      // Navigate to verify page for pending invoices
      navigate(`/lender/verify/${invoice.giid}`);
    } else if (invoice.request_status === 'APPROVED') {
      // Navigate to invoice status page for approved invoices
      navigate(`/lender/invoice-status/${invoice.giid}`);
    } else {
      // For financed/rejected, just show details (could be enhanced later)
      navigate(`/lender/verify/${invoice.giid}`);
    }
  };

  const filteredInvoices = statusFilter === 'all' 
    ? invoices 
    : invoices.filter(invoice => invoice.request_status.toLowerCase() === statusFilter.toLowerCase());

  if (loading) {
    return (
      <DashboardLayout role="lender">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-emerald mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading pipeline...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="lender">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="lender">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Financing Pipeline</h1>
          <p className="text-gray-400">Track financing requests from approval to disbursement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="text-gray-400 text-sm mb-1">Pending Review</p>
            <p className="text-3xl font-bold">{stats.pending_review}</p>
          </div>
          <div className="card text-center">
            <p className="text-gray-400 text-sm mb-1">Approved</p>
            <p className="text-3xl font-bold text-emerald">{stats.approved}</p>
          </div>
          <div className="card text-center">
            <p className="text-gray-400 text-sm mb-1">Financed</p>
            <p className="text-3xl font-bold text-cyan">{stats.disbursed}</p>
          </div>
          <div className="card text-center">
            <p className="text-gray-400 text-sm mb-1">Rejected</p>
            <p className="text-3xl font-bold text-crimson">{stats.rejected}</p>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-xl font-bold">Active Requests</h3>
            <select 
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="financed">Financed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="mb-2">No financing requests found</p>
              <p className="text-sm text-gray-500">
                {statusFilter === 'all' 
                  ? 'Financing requests will appear here when MSMEs request financing'
                  : `No ${statusFilter} requests found`
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-lighter">
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Invoice</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Company</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-navy-lighter hover:bg-navy-lighter transition-colors">
                      <td className="py-4 px-4 font-mono">{invoice.invoice_number}</td>
                      <td className="py-4 px-4">{invoice.msme_company_name}</td>
                      <td className="py-4 px-4 font-mono font-bold">{formatAmount(invoice.amount, invoice.currency)}</td>
                      <td className="py-4 px-4 text-gray-400">
                        {new Date(invoice.request_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(invoice.request_status)}
                      </td>
                      <td className="py-4 px-4">
                        <button 
                          className="text-cyan hover:underline"
                          onClick={() => handleReviewClick(invoice)}
                        >
                          Review →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
