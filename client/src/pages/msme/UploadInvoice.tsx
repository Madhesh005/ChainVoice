import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';

export default function UploadInvoice() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [hash, setHash] = useState('');
  const [ipfsStatus, setIpfsStatus] = useState<'idle' | 'computing' | 'pinning' | 'pinned'>('idle');
  const [gstStatus, setGstStatus] = useState<'idle' | 'queued' | 'checking' | 'verified'>('idle');
  const [financingAmount, setFinancingAmount] = useState(350000);
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: '',
    buyerGSTIN: '',
    sellerGSTIN: '27AAAPZ1234N1Z5',
    invoiceAmount: '',
    gstAmount: '',
    totalAmount: ''
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFile(file);
    setProcessing(true);
    
    // Simulate OCR extraction
    setTimeout(() => {
      setFormData({
        invoiceNumber: 'INV-2024-0891',
        invoiceDate: '2025-03-12',
        buyerGSTIN: '27AAAPZ9999N1Z1',
        sellerGSTIN: '27AAAPZ1234N1Z5',
        invoiceAmount: '420000',
        gstAmount: '75600',
        totalAmount: '495600'
      });
      setStep(2);
      setProcessing(false);
      
      // Start hash generation
      simulateHashGeneration();
      simulateIPFS();
      simulateGSTVerification();
    }, 1500);
  };

  const simulateHashGeneration = () => {
    const fullHash = '3f4a8b9c2d1e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0';
    let current = '';
    let index = 0;
    
    const interval = setInterval(() => {
      if (index < fullHash.length) {
        current += fullHash[index];
        setHash(current);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 50);
  };

  const simulateIPFS = () => {
    setIpfsStatus('computing');
    setTimeout(() => setIpfsStatus('pinning'), 1000);
    setTimeout(() => setIpfsStatus('pinned'), 2500);
  };

  const simulateGSTVerification = () => {
    setGstStatus('queued');
    setTimeout(() => setGstStatus('checking'), 2000);
    setTimeout(() => setGstStatus('verified'), 14000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/msme/invoices/1');
  };

  const invoiceValue = parseInt(formData.invoiceAmount) || 420000;
  const percentage = ((financingAmount / invoiceValue) * 100).toFixed(0);

  return (
    <DashboardLayout role="msme">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Upload New Invoice</h1>
          <p className="text-gray-400">Submit your invoice for blockchain verification</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-shrink-0">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all ${
                step > s ? 'bg-emerald text-white' : step === s ? 'bg-cyan text-navy' : 'bg-navy-lighter text-gray-400'
              }`}>
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 ${step > s ? 'bg-emerald' : 'bg-navy-lighter'}`}></div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN - Upload Form */}
          <div className="space-y-6">
            {step === 1 && (
              <div className="card">
                <h3 className="font-display text-xl font-bold mb-4">Step 1: Upload Invoice</h3>
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                    dragActive ? 'border-cyan bg-cyan/5' : 'border-navy-lighter hover:border-cyan'
                  }`}
                >
                  {!file ? (
                    <>
                      <div className="text-6xl mb-4 animate-bounce">☁️</div>
                      <p className="text-lg mb-2">Drag & drop invoice PDF/XML here</p>
                      <p className="text-gray-400 mb-4">or click to browse</p>
                      <p className="text-sm text-gray-500">.pdf, .xml, .json — Max 10MB</p>
                    </>
                  ) : (
                    <>
                      <div className="text-6xl mb-4">📄</div>
                      <p className="text-lg font-medium mb-2">{file.name}</p>
                      <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(2)} KB · {file.type}</p>
                      {processing && <p className="text-cyan mt-4">Processing with OCR...</p>}
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.xml,.json"
                    onChange={handleFileInput}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <form onSubmit={handleSubmit} className="card space-y-6">
                <h3 className="font-display text-xl font-bold">Step 2: OCR Extracted Data — Please Verify</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Invoice Number</span>
                      <span className="badge-info text-xs">OCR</span>
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Invoice Date</span>
                      <span className="badge-info text-xs">OCR</span>
                    </label>
                    <input
                      type="date"
                      className="input w-full"
                      value={formData.invoiceDate}
                      onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Buyer GSTIN</span>
                      <span className="badge-info text-xs">OCR</span>
                    </label>
                    <input
                      type="text"
                      className="input w-full font-mono"
                      value={formData.buyerGSTIN}
                      onChange={(e) => setFormData({...formData, buyerGSTIN: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Seller GSTIN</label>
                    <input
                      type="text"
                      className="input w-full font-mono bg-navy-lighter"
                      value={formData.sellerGSTIN}
                      readOnly
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>Invoice Amount</span>
                      <span className="badge-info text-xs">OCR</span>
                    </label>
                    <input
                      type="number"
                      className="input w-full"
                      value={formData.invoiceAmount}
                      onChange={(e) => setFormData({...formData, invoiceAmount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
                      <span>GST Amount</span>
                      <span className="badge-info text-xs">OCR</span>
                    </label>
                    <input
                      type="number"
                      className="input w-full"
                      value={formData.gstAmount}
                      onChange={(e) => setFormData({...formData, gstAmount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Total Amount</label>
                    <input
                      type="number"
                      className="input w-full bg-navy-lighter"
                      value={formData.totalAmount}
                      readOnly
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-primary w-full"
                >
                  Continue to Financing Options →
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmit} className="card space-y-6">
                <h3 className="font-display text-xl font-bold">Step 3: Financing Preference</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-3">Select Preferred Lenders</label>
                  <div className="space-y-2">
                    {[
                      { name: 'Bajaj Finserv NBFC', checked: true },
                      { name: 'HDFC Bank TReDS', checked: true },
                      { name: 'SBI Invoice Finance', checked: false },
                      { name: 'Axis Bank Supply Chain', checked: false },
                    ].map((lender) => (
                      <label key={lender.name} className="flex items-center space-x-3 p-3 bg-navy rounded-lg cursor-pointer hover:bg-navy-lighter transition-colors">
                        <input type="checkbox" defaultChecked={lender.checked} className="w-4 h-4" />
                        <span>{lender.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Financing Amount Required</label>
                  <input
                    type="range"
                    min="0"
                    max={invoiceValue}
                    value={financingAmount}
                    onChange={(e) => setFinancingAmount(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>₹0</span>
                    <span className="text-2xl font-bold text-cyan">₹{financingAmount.toLocaleString()}</span>
                    <span>₹{invoiceValue.toLocaleString()}</span>
                  </div>
                  <p className="text-center text-sm text-gray-400 mt-2">
                    You are requesting {percentage}% of invoice value
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full flex items-center justify-center space-x-2">
                  <span>Submit to Blockchain</span>
                  <span>→</span>
                </button>
              </form>
            )}
          </div>

          {/* RIGHT COLUMN - Live Preview */}
          <div className="space-y-6">
            <LivePreviewPanel hash={hash} ipfsStatus={ipfsStatus} gstStatus={gstStatus} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LivePreviewPanel({ hash, ipfsStatus, gstStatus }: { hash: string; ipfsStatus: string; gstStatus: string }) {
  return (
    <>
      {/* Hash Preview */}
      <div className="card">
        <h3 className="font-display text-lg font-bold mb-4">Cryptographic Fingerprint</h3>
        <div className="bg-navy rounded-lg p-4 mb-3">
          <p className="text-xs text-gray-400 mb-2">SHA-256:</p>
          <p className="font-mono text-sm text-cyan break-all">{hash || 'Waiting for file...'}</p>
        </div>
        <p className="text-xs text-gray-400">This hash will be stored immutably on Hyperledger Fabric</p>
      </div>

      {/* IPFS Preview */}
      <div className="card">
        <h3 className="font-display text-lg font-bold mb-4">IPFS Storage</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status:</span>
            <span className={`badge-${
              ipfsStatus === 'pinned' ? 'success' : ipfsStatus === 'idle' ? 'info' : 'warning'
            }`}>
              {ipfsStatus === 'idle' ? 'Waiting' : ipfsStatus === 'computing' ? 'Computing...' : ipfsStatus === 'pinning' ? 'Pinning...' : '✅ Pinned'}
            </span>
          </div>
          {ipfsStatus === 'pinned' && (
            <>
              <div className="bg-navy rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">CID:</p>
                <p className="font-mono text-xs text-cyan">QmX7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d</p>
              </div>
              <p className="text-xs text-gray-400">Your document is stored across 8 IPFS nodes globally</p>
            </>
          )}
        </div>
      </div>

      {/* GST Verification */}
      <div className="card">
        <h3 className="font-display text-lg font-bold mb-4">GSTN Verification</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Status:</span>
            <span className={`badge-${
              gstStatus === 'verified' ? 'success' : gstStatus === 'idle' ? 'info' : 'warning'
            }`}>
              {gstStatus === 'idle' ? 'Queued' : gstStatus === 'queued' ? 'Queued' : gstStatus === 'checking' ? 'Checking...' : '✅ Verified'}
            </span>
          </div>
          {gstStatus === 'verified' && (
            <>
              <p className="text-sm text-emerald">Buyer GSTIN confirmed active as of today</p>
              <span className="badge-info text-xs">Response in ~12 sec</span>
            </>
          )}
        </div>
      </div>

      {/* FAB Token Preview */}
      <div className="card">
        <h3 className="font-display text-lg font-bold mb-4">FAB Token (will be minted)</h3>
        <div className="flex justify-center mb-4">
          <div className={`w-24 h-24 border-4 rounded-lg transform rotate-45 transition-all ${
            gstStatus === 'verified' ? 'border-amber bg-amber/10' : 'border-navy-lighter'
          }`}></div>
        </div>
        <p className="text-sm text-gray-400 text-center">
          Token will be minted once GST verification completes
        </p>
      </div>
    </>
  );
}
