import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getInvoiceDetails, registerInvoiceIdentity, getAvailableLenders, requestFinancing } from '../../utils/api';

interface Invoice {
  id: number;
  erp_invoice_id?: number;
  invoice_number: string;
  buyer_name: string;
  buyer_gstin: string;
  seller_name: string;
  seller_gstin: string;
  invoice_date: string;
  amount: number;
  gst_amount: number;
  total_amount: number;
  status: string;
  giid?: string;
  ipfs_hash?: string;
  document_hash?: string;
  blockchain_tx_hash?: string;
  blockchain_block_number?: string;
  blockchain_timestamp?: string;
  blockchain_status?: string;
  created_at: string;
}

interface BlockchainStatus {
  status: string;
  verified: boolean;
  locked_by?: string;
  lender_id?: string;
  financed_at?: string;
  closed_at?: string;
  created_at?: string;
  updated_at?: string;
  error?: string | null;
}

interface Lender {
  id: string;
  name: string;
  type: string;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [blockchainStatus, setBlockchainStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [availableLenders, setAvailableLenders] = useState<Lender[]>([]);
  const [selectedLender, setSelectedLender] = useState<string>('');
  const [requestingFinancing, setRequestingFinancing] = useState(false);
  const [financingRequested, setFinancingRequested] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Invoice ID not provided');
      setLoading(false);
      return;
    }

    fetchInvoiceDetails();
    fetchAvailableLenders();
  }, [id]);

  const fetchAvailableLenders = async () => {
    try {
      const response = await getAvailableLenders();
      if (response.success && response.data?.lenders) {
        setAvailableLenders(response.data.lenders);
      }
    } catch (err) {
      console.error('Error fetching lenders:', err);
    }
  };

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getInvoiceDetails(id!);
      
      if (response.success && response.data?.invoice) {
        setInvoice(response.data.invoice);
        setBlockchainStatus(response.data.blockchain || null);
        
        // Show blockchain status warnings if needed
        if (response.data.blockchain?.error) {
          console.warn('Blockchain status warning:', response.data.blockchain.error);
        }
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

  const handleRequestFinancing = async () => {
    if (!invoice) return;

    // First, register invoice on blockchain if not already registered
    if (!invoice.giid || needsReregistration) {
      const erpInvoiceId = invoice.erp_invoice_id || invoice.id;

      try {
        setRegistering(true);
        setRegistrationMessage(null);
        setError(null);

        console.log(`Registering invoice identity for ERP Invoice ID: ${erpInvoiceId}`);

        const response = await registerInvoiceIdentity(erpInvoiceId);

        if (response.data?.giid) {
          // Success - update invoice with new data
          const updatedInvoice = {
            ...invoice,
            giid: response.data.giid,
            ipfs_hash: response.data.ipfs_cid,
            document_hash: response.data.document_hash,
            blockchain_status: response.data.status,
          };
          setInvoice(updatedInvoice);

          // Update blockchain status
          setBlockchainStatus({
            status: response.data.status || 'AVAILABLE',
            verified: true,
            error: null
          });

          // Show appropriate message based on whether it was reconciled
          const isReconciled = response.data.reconciled;
          const message = isReconciled ? 
            'Invoice re-registered on blockchain after ledger reset! Now select a lender and click "Request Financing" again.' :
            'Invoice registered on blockchain! Now select a lender and click "Request Financing" again.';
          
          setRegistrationMessage(message);
        } else if (response.message && response.message.includes('already exists')) {
          // Invoice already registered, refetch to get GIID
          await fetchInvoiceDetails();
          setRegistrationMessage('This invoice has already been registered. Please select a lender and request financing.');
        } else {
          setError(response.error || 'Failed to register invoice. Please try again.');
        }
      } catch (err: any) {
        console.error('Error registering invoice:', err);
        
        // Provide more specific error messages
        let errorMessage = err.message || 'Failed to register invoice. Please try again.';
        
        if (err.message?.includes('Blockchain network error')) {
          errorMessage = 'Blockchain network is currently unavailable. Please try again later.';
        } else if (err.message?.includes('Document processing error')) {
          errorMessage = 'Failed to process invoice document. Please ensure the invoice PDF is accessible.';
        } else if (err.message?.includes('already registered')) {
          errorMessage = 'This invoice has already been registered on the blockchain.';
          // Refresh the invoice details to get the latest state
          await fetchInvoiceDetails();
        }
        
        setError(errorMessage);
      } finally {
        setRegistering(false);
      }
      return;
    }

    // If already registered, request financing with selected lender
    if (!selectedLender) {
      setError('Please select a lender');
      return;
    }

    try {
      setRequestingFinancing(true);
      setError(null);
      setRegistrationMessage(null);

      console.log(`Requesting financing for GIID ${invoice.giid} with lender:`, selectedLender);

      const response = await requestFinancing({
        giid: invoice.giid,
        lender_id: selectedLender,
      });

      if (response.success) {
        const lenderName = availableLenders.find(l => l.id === selectedLender)?.name || 'the lender';
        setRegistrationMessage(
          `Financing request sent to ${lenderName} successfully! They will review your invoice.`
        );
        setSelectedLender(''); // Clear selection
        setFinancingRequested(true); // Disable the button
        
        // Disable the button by setting a flag or updating state
        // The button will be disabled based on the success message
      } else {
        setError(response.message || 'Failed to request financing. Please try again.');
      }
    } catch (err: any) {
      console.error('Error requesting financing:', err);
      setError(err.message || 'Failed to request financing. Please try again.');
    } finally {
      setRequestingFinancing(false);
    }
  };

  const handleLenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLender(e.target.value);
  };

  const formatAmount = (amount: number | null | undefined): string => {
    if (!amount) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      posted: { label: '🟢 Posted', className: 'badge-success' },
      draft: { label: '🟡 Draft', className: 'badge-warning' },
      paid: { label: '🟢 Paid', className: 'badge-success' },
      cancelled: { label: '🔴 Cancelled', className: 'badge-error' },
    };
    const statusInfo = statusMap[status?.toLowerCase()] || { label: status, className: 'badge-secondary' };
    return <span className={statusInfo.className}>{statusInfo.label}</span>;
  };

  const getBlockchainStatusBadge = (status?: string) => {
    if (!status || !blockchainStatus?.verified) {
      return <span className="badge-secondary">🔄 Not Registered</span>;
    }
    
    const statusMap: Record<string, { label: string; className: string }> = {
      AVAILABLE: { label: '🟢 Available for Financing', className: 'badge-success' },
      LOCKED: { label: '🟡 Locked', className: 'badge-warning' },
      FINANCED: { label: '🔵 Financed', className: 'badge-info' },
      CLOSED: { label: '⚫ Closed', className: 'badge-secondary' },
      NOT_FOUND_ON_BLOCKCHAIN: { label: '⚠️ Missing from Blockchain', className: 'badge-warning' },
      BLOCKCHAIN_ERROR: { label: '❌ Blockchain Error', className: 'badge-error' },
    };
    
    const statusInfo = statusMap[status.toUpperCase()] || { label: status, className: 'badge-secondary' };
    return <span className={statusInfo.className}>{statusInfo.label}</span>;
  };

  const isRegistered = Boolean(invoice?.giid && blockchainStatus?.verified);
  const needsReregistration = Boolean(invoice?.giid && !blockchainStatus?.verified);
  const canRequestFinancing = invoice?.status === 'posted' && !isRegistered;

  if (loading) {
    return (
      <DashboardLayout role="msme">
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
      <DashboardLayout role="msme">
        <div className="text-center py-12">
          <p className="text-crimson mb-4">{error || 'Invoice not found'}</p>
          <button onClick={() => navigate('/msme/invoices')} className="btn-primary">
            Back to Invoices
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="msme">
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Link to="/msme/dashboard" className="hover:text-cyan">Dashboard</Link>
          <span>›</span>
          <Link to="/msme/invoices" className="hover:text-cyan">My Invoices</Link>
          <span>›</span>
          <span className="text-white">{invoice.invoice_number}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold break-all">{invoice.invoice_number}</h1>
            {getStatusBadge(invoice.status)}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN - 60% */}
          <div className="lg:col-span-3 space-y-6">
            {/* Invoice Summary - Simple view without technical details */}
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-6">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Invoice Number</p>
                  <p className="font-mono font-bold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Invoice Date</p>
                  <p>{formatDate(invoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Buyer</p>
                  <p className="font-medium">{invoice.buyer_name || '-'}</p>
                  {invoice.buyer_gstin && (
                    <p className="text-xs text-gray-500 font-mono">GSTIN: {invoice.buyer_gstin}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Seller</p>
                  <p className="font-medium">{invoice.seller_name || '-'}</p>
                  {invoice.seller_gstin && (
                    <p className="text-xs text-gray-500 font-mono">GSTIN: {invoice.seller_gstin}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Invoice Amount</p>
                  <p className="font-mono font-bold text-xl">{formatAmount(invoice.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">GST Amount</p>
                  <p className="font-mono">{formatAmount(invoice.gst_amount)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-400 mb-1">Total Amount</p>
                  <p className="font-mono font-bold text-2xl text-cyan">{formatAmount(invoice.total_amount)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - 40% - Simplified */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card - Simple */}
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-6">Status</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Invoice Status</p>
                  <p className="font-medium capitalize">{invoice.status}</p>
                </div>
                {blockchainStatus && blockchainStatus.verified && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Available for Financing</p>
                    <div className="mt-1">
                      {getBlockchainStatusBadge(blockchainStatus.status)}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Created</p>
                  <p>{formatDate(invoice.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Actions Card - Simplified for MSME */}
            <div className="card bg-gradient-to-br from-cyan/5 to-transparent border-cyan/30">
              <h3 className="font-display text-xl font-bold mb-4">Request Financing</h3>
              <div className="space-y-3">
                {/* Success Message */}
                {registrationMessage && (
                  <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-3 text-sm text-emerald">
                    {registrationMessage}
                  </div>
                )}

                {/* Error Message */}
                {error && !loading && (
                  <div className="bg-crimson/10 border border-crimson/30 rounded-lg p-3 text-sm text-crimson">
                    {error}
                  </div>
                )}

                {/* Registered - Show lender selection */}
                {isRegistered ? (
                  <div className="space-y-3">
                    <div className="bg-emerald/10 border border-emerald/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">✓</span>
                        <div>
                          <p className="font-medium text-emerald">Invoice Registered</p>
                          <p className="text-xs text-gray-400 mt-1">
                            This invoice is securely stored and ready for financing
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Lender Selection */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Choose Your Lender</label>
                      <select
                        value={selectedLender}
                        onChange={handleLenderChange}
                        className="input w-full"
                      >
                        <option value="">-- Choose a lender --</option>
                        {availableLenders.map((lender) => (
                          <option key={lender.id} value={lender.id}>
                            {lender.name} ({lender.type})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the bank you want to request financing from
                      </p>
                    </div>

                    {/* Request Button */}
                    <button 
                      onClick={handleRequestFinancing}
                      disabled={!selectedLender || requestingFinancing || financingRequested}
                      className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {requestingFinancing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Sending Request...</span>
                        </>
                      ) : financingRequested ? (
                        <>
                          <span>Request Sent ✓</span>
                        </>
                      ) : (
                        <>
                          <span>Request Financing</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                    
                    {!financingRequested && (
                      <p className="text-xs text-center text-gray-500">
                        The lender will review your invoice and respond to your request
                      </p>
                    )}
                  </div>
                ) : (
                  /* Not registered yet - Show register button */
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">
                      Register this invoice to request financing from banks and NBFCs.
                    </p>
                    
                    {invoice?.status !== 'posted' && (
                      <div className="bg-amber/10 border border-amber/30 rounded-lg p-3 text-sm text-amber">
                        Only posted invoices can be registered for financing.
                      </div>
                    )}

                    <button 
                      onClick={handleRequestFinancing}
                      disabled={!canRequestFinancing || registering}
                      className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {registering ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Register Invoice</span>
                          <span>→</span>
                        </>
                      )}
                    </button>

                    {registering && (
                      <div className="bg-navy-lighter border border-navy-lighter rounded-lg p-3 text-xs text-gray-400">
                        <p className="font-medium mb-1">Processing...</p>
                        <p>Registering your invoice securely. This may take a moment.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
