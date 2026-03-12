import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getLenderInvoiceByGIID } from '../../utils/api';

interface InvoiceData {
  giid: string;
  invoice_number: string;
  buyer_name: string;
  seller_name: string;
  amount: number;
  currency: string;
  msme_company_name: string;
  request_status: string;
}

export default function Disburse() {
  const { giid } = useParams<{ giid: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  useEffect(() => {
    if (giid) {
      fetchInvoiceDetails();
    } else {
      setError('Invoice GIID not provided');
      setLoading(false);
    }
  }, [giid]);

  const fetchInvoiceDetails = async () => {
    try {
      setLoading(true);
      const response = await getLenderInvoiceByGIID(giid!);
      
      if (response.success && response.invoice) {
        setInvoice(response.invoice);
      } else {
        setError(response.message || 'Failed to load invoice details');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleDisburse = async () => {
    if (!invoice) return;
    
    setDisbursing(true);
    
    // Simulate disbursement process
    setTimeout(() => {
      setDisbursing(false);
      navigate('/lender/pipeline', {
        state: { message: `Funds disbursed successfully for invoice ${invoice.invoice_number}` }
      });
    }, 2000);
  };

  const formatAmount = (amount: number, currency: string = 'INR'): string => {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const calculateFinancingAmount = (amount: number): number => {
    // Typically 90% of invoice amount
    return Math.round(amount * 0.9);
  };

  const calculateInterest = (amount: number, rate: number = 3.5): number => {
    return Math.round(amount * (rate / 100));
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
          <p className="text-crimson mb-4">{error || 'Invoice not available for disbursement.'}</p>
          <button onClick={() => navigate('/lender/pipeline')} className="btn-primary">
            Back to Pipeline
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const financingAmount = calculateFinancingAmount(invoice.amount);
  const interest = calculateInterest(financingAmount);
  const processingFee = 50; // Fixed processing fee
  const expectedReturn = financingAmount + interest + processingFee;

  return (
    <DashboardLayout role="lender">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Disburse Funds</h1>
          <p className="text-gray-400">Complete financing disbursement for approved invoice</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Invoice Number</p>
                  <p className="font-mono font-bold">{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Company</p>
                  <p className="font-medium">{invoice.msme_company_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Invoice Amount</p>
                  <p className="font-mono font-bold text-2xl">{formatAmount(invoice.amount, invoice.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Financing Amount (90%)</p>
                  <p className="font-mono font-bold text-2xl text-cyan">{formatAmount(financingAmount, invoice.currency)}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Disbursement Details</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Recipient Details</label>
                  <div className="bg-navy rounded-lg p-3">
                    <p className="text-sm text-gray-400">Company: {invoice.msme_company_name}</p>
                    <p className="text-sm text-gray-400">Seller: {invoice.seller_name}</p>
                    <p className="text-sm text-gray-400 font-mono">GIID: {invoice.giid}</p>
                  </div>
                </div>

                <div className="bg-navy rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Financing Amount</span>
                    <span className="font-mono font-bold">{formatAmount(financingAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interest (3.5%)</span>
                    <span className="font-mono">{formatAmount(interest, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Processing Fee</span>
                    <span className="font-mono">{formatAmount(processingFee, invoice.currency)}</span>
                  </div>
                  <div className="border-t border-navy-lighter pt-2 flex justify-between">
                    <span className="font-bold">Expected Return</span>
                    <span className="font-mono font-bold text-emerald text-xl">{formatAmount(expectedReturn, invoice.currency)}</span>
                  </div>
                </div>

                <div className="bg-amber/10 border border-amber/30 rounded-lg p-4">
                  <p className="text-amber text-sm">
                    ⚠️ This transaction will be recorded on the blockchain and cannot be reversed. 
                    Please verify all details before proceeding.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={handleDisburse} 
                disabled={disbursing || invoice.request_status !== 'APPROVED'}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {disbursing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Disbursing...
                  </>
                ) : (
                  'Confirm & Disburse Funds'
                )}
              </button>
              <button onClick={() => navigate('/lender/pipeline')} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Timeline</h3>
              <div className="space-y-4">
                {[
                  { step: 'Invoice Submitted', status: 'complete' },
                  { step: 'Verified', status: 'complete' },
                  { step: 'Financing Approved', status: 'complete' },
                  { step: 'Funds Disbursement', status: invoice.request_status === 'APPROVED' ? 'current' : 'complete' },
                  { step: 'Repayment', status: 'pending' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className={`w-3 h-3 rounded-full mt-1 ${
                      item.status === 'complete' ? 'bg-emerald' : 
                      item.status === 'current' ? 'bg-cyan' : 'bg-gray-600'
                    }`}></div>
                    <div>
                      <p className={`font-medium ${item.status === 'pending' ? 'text-gray-500' : ''}`}>
                        {item.step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Transaction Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="font-mono">{invoice.request_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Blockchain</span>
                  <span className="font-mono">Hyperledger Fabric</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
