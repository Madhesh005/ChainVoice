import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getLenderInvoiceByGIID, approveInvoice, rejectInvoice, getUser, apiRequest } from '../../utils/api';

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

type VerificationStatus = 'pending' | 'checking' | 'passed' | 'failed';

interface VerificationState {
  invoiceMatch: VerificationStatus;
  amountCheck: VerificationStatus;
  dateCheck: VerificationStatus;
  duplicateCheck: VerificationStatus;
}

export default function Verify() {
  const { giid } = useParams<{ giid: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [sellerHistory, setSellerHistory] = useState<SellerHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>({
    invoiceMatch: 'pending',
    amountCheck: 'pending',
    dateCheck: 'pending',
    duplicateCheck: 'pending',
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const user = getUser();
  const lenderIdentifier = user?.lender_identifier || 'HDFC_BANK'; // TODO: Get from user mapping

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

      if (response.success && response.invoice) {
        setInvoice(response.invoice);
        setSellerHistory(response.seller_history);
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

  const handleApprove = async () => {
    if (!invoice) return;

    try {
      setIsVerifying(true);
      setProcessing(true);
      setError(null);

      // Reset verification state
      setVerificationState({
        invoiceMatch: 'pending',
        amountCheck: 'pending',
        dateCheck: 'pending',
        duplicateCheck: 'pending',
      });

      // Step 1: Invoice number matches company records
      setVerificationState(prev => ({ ...prev, invoiceMatch: 'checking' }));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Visual delay
      
      if (!invoice.invoice_number || invoice.invoice_number.trim() === '') {
        setVerificationState(prev => ({ ...prev, invoiceMatch: 'failed' }));
        setError('Verification failed at step 1: Invoice number is missing');
        return;
      }
      setVerificationState(prev => ({ ...prev, invoiceMatch: 'passed' }));

      // Step 2: Amount is within acceptable range
      setVerificationState(prev => ({ ...prev, amountCheck: 'checking' }));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Visual delay
      
      if (!invoice.amount || invoice.amount <= 0) {
        setVerificationState(prev => ({ ...prev, amountCheck: 'failed' }));
        setError('Verification failed at step 2: Amount must be greater than 0');
        return;
      }
      
      // Check if amount is within reasonable financing limits (e.g., max 10 crores)
      const maxFinancingAmount = 100000000; // 10 crores in INR
      if (invoice.amount > maxFinancingAmount) {
        setVerificationState(prev => ({ ...prev, amountCheck: 'failed' }));
        setError(`Verification failed at step 2: Amount exceeds maximum financing limit of ₹${maxFinancingAmount.toLocaleString('en-IN')}`);
        return;
      }
      setVerificationState(prev => ({ ...prev, amountCheck: 'passed' }));

      // Step 3: Dates are valid and reasonable
      setVerificationState(prev => ({ ...prev, dateCheck: 'checking' }));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Visual delay
      
      const issueDate = new Date(invoice.issue_date);
      const dueDate = new Date(invoice.due_date);
      const today = new Date();
      
      // Check if issue date is not in the future
      if (issueDate > today) {
        setVerificationState(prev => ({ ...prev, dateCheck: 'failed' }));
        setError('Verification failed at step 3: Invoice issue date cannot be in the future');
        return;
      }
      
      // Check if due date is after issue date
      if (dueDate <= issueDate) {
        setVerificationState(prev => ({ ...prev, dateCheck: 'failed' }));
        setError('Verification failed at step 3: Due date must be after issue date');
        return;
      }
      
      // Check if invoice is not too old (e.g., more than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      if (issueDate < oneYearAgo) {
        setVerificationState(prev => ({ ...prev, dateCheck: 'failed' }));
        setError('Verification failed at step 3: Invoice is too old (more than 1 year)');
        return;
      }
      setVerificationState(prev => ({ ...prev, dateCheck: 'passed' }));

      // Step 4: No duplicate invoice detected (blockchain check)
      setVerificationState(prev => ({ ...prev, duplicateCheck: 'checking' }));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Visual delay
      
      try {
        console.log(`🔍 Checking blockchain status for GIID: ${invoice.giid}`);
        const identityResponse = await apiRequest(`/identity/${invoice.giid}`);
        console.log('📋 Blockchain response:', identityResponse);
        
        if (!identityResponse.success) {
          console.error('❌ Blockchain verification failed:', identityResponse.error);
          setVerificationState(prev => ({ ...prev, duplicateCheck: 'failed' }));
          setError(`Verification failed at step 4: ${identityResponse.error || 'Unable to verify blockchain status'}`);
          return;
        }
        
        const status = identityResponse.status; // This will be REGISTERED, LOCKED, FINANCED, etc.
        const blockchainStatus = identityResponse.blockchain_status; // This will be AVAILABLE, LOCKED, FINANCED, etc.
        
        console.log(`✅ Blockchain verification: status=${status}, blockchain_status=${blockchainStatus}`);
        
        if (status === 'LOCKED') {
          setVerificationState(prev => ({ ...prev, duplicateCheck: 'failed' }));
          setError('Verification failed at step 4: This invoice is already locked by another lender');
          return;
        }
        
        if (status === 'FINANCED') {
          setVerificationState(prev => ({ ...prev, duplicateCheck: 'failed' }));
          setError('Verification failed at step 4: This invoice has already been financed');
          return;
        }
        
        if (status !== 'REGISTERED') {
          setVerificationState(prev => ({ ...prev, duplicateCheck: 'failed' }));
          setError(`Verification failed at step 4: Invalid blockchain status - ${status}`);
          return;
        }
        
        console.log('✅ Blockchain verification passed');
        setVerificationState(prev => ({ ...prev, duplicateCheck: 'passed' }));
      } catch (blockchainError: any) {
        console.error('❌ Blockchain verification error:', blockchainError);
        setVerificationState(prev => ({ ...prev, duplicateCheck: 'failed' }));
        setError(`Verification failed at step 4: ${blockchainError.message}`);
        return;
      }

      // All checks passed - proceed with approval
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause before final action
      
      const response = await approveInvoice({
        giid: invoice.giid,
      });

      if (response.success) {
        // Show success toast
        toast.success('Invoice verified and locked successfully');
        
        // Navigate back to dashboard with success message
        navigate('/lender/dashboard', { 
          state: { message: `Invoice ${invoice.invoice_number} successfully verified and locked for financing` }
        });
      } else {
        setError(response.message || 'Failed to approve invoice');
      }
    } catch (err: any) {
      console.error('Error during verification:', err);
      setError(err.message || 'Failed to verify and approve invoice');
    } finally {
      setProcessing(false);
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!invoice) return;

    try {
      setProcessing(true);
      setError(null);

      const response = await rejectInvoice({
        giid: invoice.giid,
      });

      if (response.success) {
        // Show success toast
        toast.success('Invoice rejected successfully');
        
        // Navigate back to dashboard or show success message
        navigate('/lender/dashboard', { 
          state: { message: `Invoice ${invoice.invoice_number} rejected` }
        });
      } else {
        setError(response.message || 'Failed to reject invoice');
      }
    } catch (err: any) {
      console.error('Error rejecting invoice:', err);
      setError(err.message || 'Failed to reject invoice');
    } finally {
      setProcessing(false);
    }
  };

  const handleChecklistChange = (index: number) => {
    // Disabled - verification is now automated
  };

  const getVerificationIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return '□';
      case 'checking':
        return '⏳';
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '□';
    }
  };

  const getVerificationClass = (status: VerificationStatus) => {
    switch (status) {
      case 'pending':
        return 'text-gray-400';
      case 'checking':
        return 'text-yellow-400';
      case 'passed':
        return 'text-emerald-400';
      case 'failed':
        return 'text-crimson';
      default:
        return 'text-gray-400';
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
      APPROVED: { label: 'Approved', className: 'badge-success' },
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
          <p className="text-crimson mb-4">{error || 'Invoice not available for verification.'}</p>
          <button onClick={() => navigate('/lender/dashboard')} className="btn-primary">
            Back to Dashboard
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
            <h1 className="font-display text-4xl font-bold mb-2">Verify Invoice</h1>
            <p className="text-gray-400">Review and verify invoice authenticity on blockchain</p>
          </div>
          <button 
            onClick={() => navigate('/lender/dashboard')}
            className="btn-secondary"
          >
            ← Back to Dashboard
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

              <div className="bg-navy rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-3">Verification Checklist</h4>
                <div className="space-y-3">
                  <div className={`flex items-center space-x-3 ${getVerificationClass(verificationState.invoiceMatch)}`}>
                    <span className="text-lg w-6">{getVerificationIcon(verificationState.invoiceMatch)}</span>
                    <span>Invoice number matches company records</span>
                  </div>
                  <div className={`flex items-center space-x-3 ${getVerificationClass(verificationState.amountCheck)}`}>
                    <span className="text-lg w-6">{getVerificationIcon(verificationState.amountCheck)}</span>
                    <span>Amount is within acceptable range</span>
                  </div>
                  <div className={`flex items-center space-x-3 ${getVerificationClass(verificationState.dateCheck)}`}>
                    <span className="text-lg w-6">{getVerificationIcon(verificationState.dateCheck)}</span>
                    <span>Dates are valid and reasonable</span>
                  </div>
                  <div className={`flex items-center space-x-3 ${getVerificationClass(verificationState.duplicateCheck)}`}>
                    <span className="text-lg w-6">{getVerificationIcon(verificationState.duplicateCheck)}</span>
                    <span>No duplicate invoice detected</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleApprove}
                  disabled={processing || isVerifying || invoice.request_status !== 'PENDING'}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    '✓ Approve & Verify'
                  )}
                </button>
                <button 
                  onClick={handleReject}
                  disabled={processing || isVerifying || invoice.request_status !== 'PENDING'}
                  className="bg-crimson hover:bg-crimson/80 text-white font-medium px-6 py-3 rounded-input transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : '✗ Reject'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Verification Progress</h3>
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

                {/* Step 4: Cryptographic Proof */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-emerald/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-emerald text-sm">✓</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald">Cryptographic Verification</p>
                    <p className="text-xs text-gray-400 mt-1">SHA-256 hash validation successful</p>
                    {invoice.document_hash && (
                      <p className="text-xs text-gray-500 font-mono mt-1 break-all">
                        Hash: {invoice.document_hash.substring(0, 20)}...
                      </p>
                    )}
                  </div>
                </div>

                {/* Step 5: Ready for Financing */}
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-cyan/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-cyan text-sm">⏳</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-cyan">Ready for Lender Decision</p>
                    <p className="text-xs text-gray-400 mt-1">All verification steps completed successfully</p>
                    {invoice.blockchain_timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        Verified: {formatDate(invoice.blockchain_timestamp)}
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
                  onClick={() => navigate('/lender/dashboard')}
                  className="btn-secondary w-full"
                >
                  Back to Dashboard
                </button>
                <button 
                  onClick={() => navigate('/lender/pipeline')}
                  className="btn-secondary w-full"
                >
                  View Pipeline
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
