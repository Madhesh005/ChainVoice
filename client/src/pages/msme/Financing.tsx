import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getInvoices } from '../../utils/api';

interface Invoice {
  id: number;
  invoice_number: string;
  buyer_name: string;
  amount: number;
  currency: string;
  status: string;
}

export default function Financing() {
  const [verifiedInvoices, setVerifiedInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [financingAmount, setFinancingAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVerifiedInvoices();
  }, []);

  const fetchVerifiedInvoices = async () => {
    try {
      setLoading(true);
      // Fetch only posted invoices for financing
      const response = await getInvoices();
      
      if (response.success) {
        const allInvoices = response.invoices || [];
        // Filter only posted invoices (ready for financing)
        const postedInvoices = allInvoices.filter((inv: Invoice) => 
          inv.status.toLowerCase() === 'posted'
        );
        setVerifiedInvoices(postedInvoices);
        if (postedInvoices.length > 0) {
          setSelectedInvoice(postedInvoices[0]);
          setFinancingAmount(Math.floor(postedInvoices[0].amount * 0.8)); // 80% of invoice value
        }
      } else {
        setError(response.message || 'Failed to load invoices');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = verifiedInvoices.find(inv => inv.id.toString() === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setFinancingAmount(Math.floor(invoice.amount * 0.8));
    }
  };

  const maxFinancing = selectedInvoice ? Math.floor(selectedInvoice.amount * 0.9) : 0;

  if (loading) {
    return (
      <DashboardLayout role="msme">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-cyan mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading financing options...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="msme">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Apply for Financing</h1>
          <p className="text-gray-400">Get instant capital against your verified invoices</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {verifiedInvoices.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold mb-2">No Posted Invoices Available</h3>
            <p className="text-gray-400 mb-6">
              You need posted invoices from your ERP to apply for financing.
            </p>
            <div className="flex justify-center space-x-3">
              <Link to="/msme/erp-connection" className="btn-primary">
                Connect ERP
              </Link>
              <Link to="/msme/invoices" className="btn-secondary">
                View Invoices
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="card space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Invoice</label>
                  <select 
                    className="input w-full"
                    value={selectedInvoice?.id || ''}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                  >
                    {verifiedInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} - {inv.currency === 'INR' ? '₹' : '$'}{inv.amount.toLocaleString()} ({inv.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Financing Amount</label>
                  <input 
                    type="number" 
                    className="input w-full" 
                    value={financingAmount}
                    onChange={(e) => setFinancingAmount(Number(e.target.value))}
                    max={maxFinancing}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    Maximum: {selectedInvoice?.currency === 'INR' ? '₹' : '$'}{maxFinancing.toLocaleString()} (90% of invoice value)
                  </p>
                </div>

                <div className="bg-navy rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Requested Amount</span>
                    <span className="font-mono font-bold text-cyan text-xl">
                      {selectedInvoice?.currency === 'INR' ? '₹' : '$'}{financingAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Financing terms and interest rates will be determined by the lender based on your invoice and credit profile.
                  </p>
                </div>

                <button className="btn-primary w-full">Submit Financing Request</button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="card">
                <h3 className="font-display text-xl font-bold mb-4">Benefits</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>✓ Instant approval for verified invoices</li>
                  <li>✓ Competitive interest rates</li>
                  <li>✓ No hidden fees</li>
                  <li>✓ Blockchain-secured transactions</li>
                  <li>✓ Flexible repayment terms</li>
                </ul>
              </div>

              <div className="card">
                <h3 className="font-display text-xl font-bold mb-4">How It Works</h3>
                <ol className="space-y-3 text-sm text-gray-400">
                  <li className="flex items-start">
                    <span className="text-cyan font-bold mr-2">1.</span>
                    <span>Select a verified invoice</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan font-bold mr-2">2.</span>
                    <span>Choose financing amount</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan font-bold mr-2">3.</span>
                    <span>Submit request for lender approval</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-cyan font-bold mr-2">4.</span>
                    <span>Receive funds within 24 hours</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
