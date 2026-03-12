import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getLenderInvoiceByGIID, getUser, apiRequest } from '../../utils/api';

interface InvoiceData {
  giid: string;
  invoice_number: string;
  buyer_name: string;
  seller_name: string;
  seller_gstin: string;
  amount: number;
  currency: string;
  issue_date: string;
  due_date: string;
  ipfs_cid: string;
  document_hash: string;
  blockchain_tx_hash: string;
  blockchain_timestamp: string;
  blockchain_status: string;
  request_status: string;
  request_date: string;
  msme_company_name: string;
  msme_contact_person: string;
}

interface SellerHistory {
  total_invoices: number;
  verified: number;
  rejected: number;
  success_rate: number;
}

export default function InvoiceStatus() {
  const { giid } = useParams<{ giid: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [sellerHistory, setSellerHistory] = useState<SellerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const user = getUser();

  useEffect(() => {
    if (!giid) {
      setError('Invoice GIID not provided');
      setLoading(false);
      return;
    }

    fetchInvoiceDetails();
  }, [giid]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`Fetching invoice details for GIID: ${giid}`);

      const response = await getLenderInvoiceByGIID(giid!);

      if (response.success && (response as any).invoice) {
        setInvoice((response as any).invoice);
        setSellerHistory((response as any).seller_history);
      } else {
        setError(response.message || 'Failed to load invoice details');
      }
    } catch (err: any) {
      console.error('Error fetching invoice:', err);
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice?.ipfs_cid) {
      setError('IPFS document not available');
      return;
    }

    try {
      const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${invoice.ipfs_cid}`;
      window.open(ipfsUrl, '_blank');
    } catch (err) {
      setError('Unable to load document from IPFS');
    }
  };

  const handleFinance = async () => {
    if (!invoice) return;

    try {
      setProcessing(true);
      setError(null);

      console.log(`💰 Financing invoice ${invoice.giid}`);

      const response = await apiRequest('/api/financing/finance', {
        method: 'POST',
        body: JSON.stringify({
          giid: invoice.giid,
        }),
      });

      if (response.success) {
        // Show success toast
        toast.success('Invoice financed successfully');
        
        // Navigate back to pipeline with success message
        navigate('/lender/pipeline', { 
          state: { message: `Invoice ${invoice.invoice_number} successfully financed` }
        });
      } else {
        setError(response.message || 'Failed to finance invoice');
      }
    } catch (err: any) {
      console.error('Error financing invoice:', err);
      setError(err.message || 'Failed to finance invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invoice) return;

    try {
      setProcessing(true);
      setError(null);

      console.log(`🔓 Declining invoice ${invoice.giid}`);

      const response = await apiRequest('/api/financing/unlock', {
        method: 'POST',
        body: JSON.stringify({
          giid: invoice.giid,
        }),
      });

      if (response.success) {
        // Show success toast
        toast.success('Invoice declined and unlocked for other lenders');
        
        // Navigate back to pipeline with success message
        navigate('/lender/pipeline', { 
          state: { message: `Invoice ${invoice.invoice_number} declined and unlocked` }
        });
      } else {
        setError(response.message || 'Failed to decline invoice');
      }
    } catch (err: any) {
      console.error('Error declining invoice:', err);
      setError(err.message || 'Failed to decline invoice');
    } finally {
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number, currency: string = 'INR'): string => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending Verification', className: 'badge-warning' },
      APPROVED: { label: 'Approved & Locked', className: 'badge-success' },
      FINANCED: { label: 'Financed', className: 'badge-info' },
      REJECTED: { label: 'Rejected', className: 'badge-error' },
    };
    const statusInfo = statusMap[status] || { label: status, className: 'badge-secondary' };
    return <span className={statusInfo.className}>{statusInfo.label}</span>;
  };

  if (loading) {
    return (
      <DashboardLayout role="lender">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan mx-auto mb-4"></div>
            <p className="text-gray-400">Loading invoice details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout role="lender">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Invoice Not Available</h2>
          <p className="text-crimson mb-4">{error || 'Invoice not available.'}</p>
          <button onClick={() => navigate('/lender/pipeline')} className="btn-primary">
            Back to Pipeline
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="lender">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">Invoice Status</h1>
            <p className="text-gray-400">Finalize financing decision for approved invoice</p>
          </div>
          <button 
            onClick={() => navigate('/lender/pipeline')}
            className="btn-secondary"
          >
            ← Back to Pipeline
          </button>
        </div>

        {error && (
          <div className="bg-crimson/10 border border-crimson/30 rounded-lg p-4 text-crimson">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-display text-2xl font-bold mb-1">{invoice.invoice_number}</h3>
                  <p className="text-gray-400">Submitted by {invoice.msme_company_name}</p>
                  <p className="text-sm text-gray-500">Contact: {invoice.msme_contact_person}</p>
                </div>
                {getStatusBadge(invoice.request_status)}
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Invoice Amount</p>
                  <p className="font-mono text-3xl font-bold text-cyan">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Buyer</p>
                  <p className="font-medium text-xl">{invoice.buyer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Issue Date</p>
                  <p>{formatDate(invoice.issue_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Due Date</p>
                  <p>{formatDate(invoice.due_date)}</p>
                </div>
              </div>

              <div className="bg-navy rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-3">Invoice Document</h4>
                <div className="border border-navy-lighter rounded-lg p-8 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-gray-400 mb-4">{invoice.invoice_number}.pdf</p>
                  {invoice.ipfs_cid ? (
                    <button 
                      onClick={handleDownloadPDF}
                      className="btn-secondary"
                    >
                      Download & Review
                    </button>
                  ) : (
                    <p className="text-crimson">Document not available on IPFS</p>
                  )}
                </div>
              </div>

              <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-3 text-emerald">✅ Verification Complete</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-3 text-emerald">
                    <span className="text-lg w-6">✅</span>
                    <span>Invoice number matches company records</span>
                  </div>
                  <div className="flex items-center space-x-3 text-emerald">
                    <span className="text-lg w-6">✅</span>
                    <span>Amount is within acceptable range</span>
                  </div>
                  <div className="flex items-center space-x-3 text-emerald">
                    <span className="text-lg w-6">✅</span>
                    <span>Dates are valid and reasonable</span>
                  </div>
                  <div className="flex items-center space-x-3 text-emerald">
                    <span className="text-lg w-6">✅</span>
                    <span>No duplicate invoice detected</span>
                  </div>
                </div>
              </div>

              <div className="bg-cyan/10 border border-cyan/30 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-3 text-cyan">💰 Financing Decision</h4>
                <p className="text-sm text-gray-400 mb-4">
                  This invoice has been verified and locked. Make your final financing decision:
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={handleFinance}
                    disabled={processing || invoice.request_status !== 'APPROVED'}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      '💰 Finance'
                    )}
                  </button>
                  <button 
                    onClick={handleDecline}
                    disabled={processing || invoice.request_status !== 'APPROVED'}
                    className="bg-crimson hover:bg-crimson/80 text-white font-medium px-6 py-3 rounded-input transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
                  >
                    {processing ? 'Processing...' : '❌ Decline'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Verification Status</h3>
              <div className="space-y-4">
                {/* Step 1: Document Integrity */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald">Document Integrity Verified</p>
                    <p className="text-xs text-gray-400 mt-1">PDF document hash matches blockchain record</p>
                  </div>
                </div>

                {/* Step 2: Blockchain Registration */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald">Blockchain Registration Complete</p>
                    <p className="text-xs text-gray-400 mt-1">Invoice registered on Hyperledger Fabric</p>
                    <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                      GIID: {invoice.giid.substring(0, 32)}...
                    </p>
                  </div>
                </div>

                {/* Step 3: IPFS Storage */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald">Document Stored on IPFS</p>
                    <p className="text-xs text-gray-400 mt-1">Decentralized storage ensures immutability</p>
                    {invoice.ipfs_cid && (
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                        CID: {invoice.ipfs_cid.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 4: Lender Verification */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald">Lender Verification Complete</p>
                    <p className="text-xs text-gray-400 mt-1">Invoice approved and locked for financing</p>
                    {invoice.blockchain_timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        Verified: {formatDate(invoice.blockchain_timestamp)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 5: Awaiting Financing Decision */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-cyan/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-cyan text-sm">💰</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-cyan">Awaiting Financing Decision</p>
                    <p className="text-xs text-gray-400 mt-1">Ready for final financing approval</p>
                    {invoice.document_hash && (
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                        Hash: {invoice.document_hash.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {sellerHistory && (
              <div className="card">
                <h3 className="font-display text-xl font-bold mb-4">Seller History</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Invoices</span>
                    <span className="font-bold">{sellerHistory.total_invoices}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Verified</span>
                    <span className="font-bold text-emerald">{sellerHistory.verified}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Rejected</span>
                    <span className="font-bold text-crimson">{sellerHistory.rejected}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="font-bold">{sellerHistory.success_rate}%</span>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/lender/pipeline')}
                  className="btn-secondary w-full"
                >
                  Back to Pipeline
                </button>
                <button 
                  onClick={() => navigate('/lender/dashboard')}
                  className="btn-secondary w-full"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}