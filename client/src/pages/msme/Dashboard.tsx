import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getMSMEDashboard } from '../../utils/api';

interface DashboardData {
  company_name: string;
  contact_person: string;
  email: string;
  gstin: string;
  total_invoices: number;
  posted_invoices: number;
  draft_invoices: number;
  blockchain_registered: number;
  total_amount: number;
  posted_amount: number;
  recent_invoices: Array<{
    id: number;
    invoice_number: string;
    buyer_name: string;
    amount: number;
    currency: string;
    status: string;
    invoice_date: string;
    giid: string | null;
    erp_type: string;
  }>;
  recent_activities: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    invoice_number: string | null;
    metadata: any;
    created_at: string;
  }>;
}

export default function MsmeDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching dashboard data...');
      const response = await getMSMEDashboard();
      
      console.log('Dashboard response:', response);
      console.log('Dashboard data:', response.data);
      console.log('Recent activities:', response.data?.recent_activities);
      
      if (response.success) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message || 'An error occurred while loading dashboard. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <DashboardLayout role="msme">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-cyan mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
      <DashboardLayout role="msme">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout role="msme">
        <div className="text-gray-400">No data available</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="msme">
      <div className="space-y-8">
        {/* Dashboard Header */}
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">
            {greeting}, {dashboardData.company_name} 👋
          </h1>
          <p className="text-gray-400">Here's your invoice financing snapshot</p>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <KPICard
            title="Active Invoices"
            value={dashboardData.total_invoices.toString()}
            subtitle={`${dashboardData.posted_invoices} posted, ${dashboardData.draft_invoices} draft`}
            icon="📄"
            color="cyan"
            borderColor="border-l-4 border-cyan"
          />
          <KPICard
            title="Blockchain Registered"
            value={dashboardData.blockchain_registered.toString()}
            subtitle="Verified on ledger"
            icon="⬡"
            color="amber"
            borderColor="border-l-4 border-amber"
          />
          <KPICard
            title="Total Amount"
            value={`₹${(dashboardData.total_amount / 100000).toFixed(1)}L`}
            subtitle={`₹${(dashboardData.posted_amount / 100000).toFixed(1)}L posted`}
            icon="₹"
            color="emerald"
            borderColor="border-l-4 border-emerald"
          />
          <KPICard
            title="Posted Invoices"
            value={dashboardData.posted_invoices.toString()}
            subtitle={`${((dashboardData.posted_invoices / dashboardData.total_invoices) * 100).toFixed(0)}% of total`}
            icon="⚡"
            color="cyan"
            borderColor="border-l-4 border-cyan"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Invoices Table - Takes 2 columns */}
          <div className="lg:col-span-2 overflow-x-auto">
            <RecentInvoicesTable invoices={dashboardData.recent_invoices} />
          </div>

          {/* Activity Timeline - Takes 1 column */}
          <div>
            <ActivityTimeline activities={dashboardData.recent_activities || []} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  borderColor: string;
}

function KPICard({ title, value, subtitle, icon, color, borderColor }: KPICardProps) {
  return (
    <div className={`card hover:shadow-cyan-glow hover:-translate-y-1 transition-all duration-300 ${borderColor}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <h3 className={`text-3xl font-display font-bold text-${color} mb-1`}>{value}</h3>
          <p className="text-gray-500 text-xs">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 bg-${color}/10 rounded-xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function RecentInvoicesTable({ invoices }: { invoices: DashboardData['recent_invoices'] }) {
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      'draft': { label: '🟡 Draft', class: 'badge-warning' },
      'posted': { label: '🔵 Posted', class: 'badge-info' },
      'verified': { label: '🟢 Verified', class: 'badge-success' },
      'financed': { label: '🟢 Financed', class: 'badge-success' },
      'rejected': { label: '🔴 Rejected', class: 'badge-error' },
    };
    return badges[status.toLowerCase()] || { label: status, class: 'badge bg-gray-600/20 text-gray-400 border border-gray-600/30' };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-display text-xl font-bold">Recent Invoices</h3>
        <Link to="/msme/invoices" className="text-cyan hover:underline text-sm flex items-center space-x-1">
          <span>View All</span>
          <span>→</span>
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No invoices found</p>
          <Link to="/msme/invoices/upload" className="text-cyan hover:underline mt-2 inline-block">
            Upload your first invoice →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-lighter">
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">Invoice ID</th>
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">Buyer Name</th>
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">Amount</th>
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">Date</th>
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">GIID</th>
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-400 text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const statusBadge = getStatusBadge(inv.status);
                return (
                  <tr 
                    key={inv.id} 
                    className="border-b border-navy-lighter hover:bg-navy-lighter/50 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/msme/invoices/${inv.id}`}
                  >
                    <td className="py-4 px-3 font-mono text-sm text-cyan">{inv.invoice_number}</td>
                    <td className="py-4 px-3 text-sm">{inv.buyer_name}</td>
                    <td className="py-4 px-3 font-mono font-bold text-sm">
                      {inv.currency === 'INR' ? '₹' : '$'}{inv.amount.toLocaleString()}
                    </td>
                    <td className="py-4 px-3 text-gray-400 text-sm">{formatDate(inv.invoice_date)}</td>
                    <td className="py-4 px-3 font-mono text-xs text-gray-400">
                      {inv.giid ? inv.giid.substring(0, 8) + '...' : '-'}
                    </td>
                    <td className="py-4 px-3">
                      <span className={statusBadge.class}>{statusBadge.label}</span>
                    </td>
                    <td className="py-4 px-3">
                      <button className="text-cyan hover:text-cyan-dark transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ActivityTimeline({ activities = [] }: { activities?: DashboardData['recent_activities'] }) {
  const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const activityDate = new Date(dateStr);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return activityDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice_registered':
        return { icon: '📝', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
      case 'erp_synced':
        return { icon: '🔄', color: 'text-cyan', bg: 'bg-cyan/10' };
      case 'financing_requested':
        return { icon: '💰', color: 'text-amber', bg: 'bg-amber/10' };
      default:
        return { icon: '📌', color: 'text-gray-400', bg: 'bg-gray-400/10' };
    }
  };

  return (
    <div className="card">
      <h3 className="font-display text-xl font-bold mb-6">Recent Activity</h3>
      
      {!activities || activities.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mb-2">No recent activity</p>
          <p className="text-sm text-gray-500">Activity will appear here as you use the system</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const { icon, color, bg } = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 text-lg`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-400 mt-1">{activity.description}</p>
                  )}
                  {activity.invoice_number && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      Invoice: {activity.invoice_number}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(activity.created_at)}</p>
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute left-8 top-12 w-0.5 h-full bg-navy-lighter -z-10" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-navy-lighter">
        <Link to="/msme/invoices" className="text-cyan hover:underline text-sm flex items-center justify-center space-x-1">
          <span>View Invoices</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
