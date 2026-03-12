import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/StatCard';
import { getLenderDashboardStats, getLenderPendingInvoices, getLenderActivity } from '../../utils/api';

interface DashboardStats {
  pending_verification: number;
  active_financing: number;
  portfolio_size: number;
  default_rate: number;
  total_invoices: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  buyer_name: string;
  seller_name: string;
  amount: number;
  currency: string;
  invoice_date: string;
  msme_company_name: string;
  blockchain_status: string;
}

interface Activity {
  id: number;
  lender_identifier: string;
  giid: string;
  action: string;
  description: string;
  created_at: string;
  // Legacy fields for backward compatibility
  invoice_number?: string;
  activity_type?: string;
  activity_icon?: string;
  amount?: number;
  currency?: string;
  msme_company_name?: string;
  timestamp?: string;
}

export default function LenderDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get lender identifier from authenticated user
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const lenderIdentifier = user.lender_identifier || 'HDFC_BANK'; // Fallback for development

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch all data in parallel
      const [statsResponse, invoicesResponse, activityResponse] = await Promise.all([
        getLenderDashboardStats(lenderIdentifier),
        getLenderPendingInvoices(lenderIdentifier, 5),
        getLenderActivity(lenderIdentifier, 5),
      ]);

      if (statsResponse.success) {
        console.log('📊 Stats response:', statsResponse);
        setStats(statsResponse.statistics);
      } else {
        console.error('❌ Stats response failed:', statsResponse);
      }

      if (invoicesResponse.success) {
        console.log('📋 Invoices response:', invoicesResponse);
        setPendingInvoices(invoicesResponse.invoices || []);
      } else {
        console.error('❌ Invoices response failed:', invoicesResponse);
      }

      if (activityResponse.success) {
        console.log('📈 Activity response:', activityResponse);
        setRecentActivity(activityResponse.activities || []);
      } else {
        console.error('❌ Activity response failed:', activityResponse);
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number | undefined, currency: string = 'INR'): string => {
      // Handle undefined or null amounts
      if (amount === undefined || amount === null || isNaN(amount)) {
        return currency === 'INR' ? '₹0' : '0';
      }

      if (currency === 'INR') {
        // Convert to lakhs for large amounts
        if (amount >= 100000) {
          return `₹${(amount / 100000).toFixed(2)}L`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
      }
      return `${amount.toLocaleString()}`;
    };

  const formatTimeAgo = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (loading) {
    return (
      <DashboardLayout role="lender">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-emerald mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading dashboard...</p>
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
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Lender Dashboard</h1>
          <p className="text-gray-400">Verify invoices and manage your financing portfolio</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Pending Verification" 
            value={stats?.pending_verification.toString() || '0'} 
            icon="⏳" 
          />
          <StatCard 
            title="Active Financing" 
            value={formatAmount(stats?.active_financing || 0)} 
            icon="💰" 
          />
          <StatCard 
            title="Portfolio Size" 
            value={stats?.portfolio_size.toString() || '0'} 
            icon="📊" 
          />
          <StatCard 
            title="Default Rate" 
            value={`${stats?.default_rate?.toFixed(2) || '0.00'}%`} 
            icon="⚠️" 
            trend={stats && stats.default_rate < 1 ? 'down' : undefined}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Verification Queue */}
          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Verification Queue</h3>
            
            {pendingInvoices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mb-2">No invoices pending verification</p>
                <p className="text-sm text-gray-500">New invoices will appear here when MSMEs request financing</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {pendingInvoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="flex justify-between items-center p-3 bg-navy rounded-lg hover:bg-navy-lighter transition-colors cursor-pointer"
                      onClick={() => navigate(`/lender/verify/${invoice.giid || invoice.id}`)}
                    >
                      <div>
                        <p className="font-mono font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-400">{invoice.msme_company_name}</p>
                        <p className="text-xs text-gray-500">Buyer: {invoice.buyer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold">{formatAmount(invoice.amount, invoice.currency)}</p>
                        <span className="badge-warning text-xs">Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => navigate('/lender/pipeline')}
                  className="btn-primary w-full mt-4"
                >
                  View All
                </button>
              </>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Recent Activity</h3>
            
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mb-2">No recent activity</p>
                <p className="text-sm text-gray-500">Activity will appear here as you verify and finance invoices</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-navy rounded-lg">
                    <div className="w-8 h-8 bg-emerald/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald">
                        {activity.action === 'LOCKED' ? '🔒' : 
                         activity.action === 'FINANCED' ? '💰' : 
                         activity.action === 'REJECTED' ? '❌' : '📋'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="font-medium text-sm truncate">{activity.action || activity.activity_type}</p>
                      <p className="text-sm text-gray-400 font-mono truncate">{activity.giid || activity.invoice_number}</p>
                      <p className="text-xs text-gray-500 break-words">{activity.description}</p>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0 whitespace-nowrap">
                      {formatTimeAgo(activity.created_at || activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
