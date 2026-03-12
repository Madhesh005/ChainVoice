import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MSMERegister from './pages/auth/MSMERegister';
import MSMELogin from './pages/auth/MSMELogin';
import LenderRegister from './pages/auth/LenderRegister';
import MsmeDashboard from './pages/msme/Dashboard';
import Invoices from './pages/msme/Invoices';
import UploadInvoice from './pages/msme/UploadInvoice';
import InvoiceDetail from './pages/msme/InvoiceDetail';
import ERPConnection from './pages/msme/ERPConnection';
import Financing from './pages/msme/Financing';
import LenderDashboard from './pages/lender/Dashboard';
import Verify from './pages/lender/Verify';
import InvoiceStatus from './pages/lender/InvoiceStatus';
import Pipeline from './pages/lender/Pipeline';
import Disburse from './pages/lender/Disburse';
import Portfolio from './pages/lender/Portfolio';
import RegulatorDashboard from './pages/regulator/Dashboard';
import Audit from './pages/regulator/Audit';
import Analytics from './pages/regulator/Analytics';
import Alerts from './pages/regulator/Alerts';
import BlockchainExplorer from './pages/shared/BlockchainExplorer';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f1f5f9',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f1f5f9',
            },
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/msme/register" element={<MSMERegister />} />
        <Route path="/auth/msme/login" element={<MSMELogin />} />
        <Route path="/auth/lender/register" element={<LenderRegister />} />
        
        <Route path="/msme/dashboard" element={<MsmeDashboard />} />
        <Route path="/msme/invoices" element={<Invoices />} />
        <Route path="/msme/invoices/upload" element={<UploadInvoice />} />
        <Route path="/msme/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/msme/erp-connection" element={<ERPConnection />} />
        <Route path="/msme/financing" element={<Financing />} />
        
        <Route path="/lender/dashboard" element={<LenderDashboard />} />
        <Route path="/lender/verify" element={<Verify />} />
        <Route path="/lender/verify/:giid" element={<Verify />} />
        <Route path="/lender/invoice-status/:giid" element={<InvoiceStatus />} />
        <Route path="/lender/pipeline" element={<Pipeline />} />
        <Route path="/lender/disburse/:id" element={<Disburse />} />
        <Route path="/lender/portfolio" element={<Portfolio />} />
        
        <Route path="/regulator/dashboard" element={<RegulatorDashboard />} />
        <Route path="/regulator/audit" element={<Audit />} />
        <Route path="/regulator/analytics" element={<Analytics />} />
        <Route path="/regulator/alerts" element={<Alerts />} />
        
        <Route path="/shared/blockchain-explorer" element={<BlockchainExplorer />} />
        
        {/* 404 Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
