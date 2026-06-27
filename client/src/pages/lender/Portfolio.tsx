import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/StatCard';
import { getPortfolioStatsTyped, getPortfolioSectorsTyped, getPortfolioInvoicesTyped } from '../../utils/api';

interface PortfolioStats {
  total_financed: number;
  active_invoices: number;
  avg_interest_rate: number;
  expected_returns: number;
  default_rate: number;
  avg_payment_days: number;
}

interface SectorBreakdown {
  sector: string;
  count: number;
  amount: number;
  percentage: number;
}

interface FinancedInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  buyer_name: string;
  msme_company_name: string;
  amount: number;
  currency: string;
  financing_status: string;
  financed_date: string;
}

export default function Portfolio() {
  const [stats, setStats] = useState<PortfolioStats | null>(null);
  const [sectorData, setSectorData] = useState<SectorBreakdown[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<FinancedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch portfolio statistics
      const [statsResponse, sectorsResponse, invoicesResponse] = await Promise.all([
        getPortfolioStatsTyped(),
        getPortfolioSectorsTyped(),
        getPortfolioInvoicesTyped('APPROVED', 10) // Get recent 10 approved invoices
      ]);
      
      if (statsResponse.success && statsResponse.portfolio_stats) {
        setStats(statsResponse.portfolio_stats as PortfolioStats);
      }

      if (sectorsResponse.success && sectorsResponse.sectors) {
        setSectorData(sectorsResponse.sectors as SectorBreakdown[]);
      }

      if (invoicesResponse.success && invoicesResponse.invoices) {
        setRecentInvoices(invoicesResponse.invoices as FinancedInvoice[]);
      }

    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) { // 1 thousand
      return `₹${(amount / 1000).toFixed(0)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
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
            <p className="text-gray-400">Loading portfolio...</p>
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
          <h1 className="font-display text-4xl font-bold mb-2">Active Portfolio</h1>
          <p className="text-gray-400">Monitor your financed invoices and returns</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Financed" 
            value={formatAmount(stats?.total_financed || 0)} 
            icon="💰" 
          />
          <StatCard 
            title="Active Invoices" 
            value={stats?.active_invoices.toString() || '0'} 
            icon="📊" 
          />
          <StatCard 
            title="Avg. Interest Rate" 
            value={(stats?.avg_interest_rate && stats.avg_interest_rate > 0) ? `${stats.avg_interest_rate.toFixed(1)}%` : 'N/A'} 
            icon="📈" 
          />
          <StatCard 
            title="Expected Returns" 
            value={(stats?.expected_returns && stats.expected_returns > 0) ? formatAmount(stats.expected_returns) : 'N/A'} 
            icon="💵" 
            trend={stats && stats.expected_returns && stats.expected_returns > 0 ? 'up' : undefined}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Portfolio Breakdown</h3>
              
              {sectorData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="mb-2">No portfolio data available</p>
                  <p className="text-sm text-gray-500">Portfolio breakdown will appear here as you finance more invoices</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sectorData.map((sector) => (
                    <div key={sector.sector}>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{sector.sector}</span>
                        <span className="text-gray-400">{sector.count} invoices · {formatAmount(sector.amount)}</span>
                      </div>
                      <div className="w-full bg-navy-lighter rounded-full h-2">
                        <div 
                          className="bg-cyan h-2 rounded-full transition-all duration-500"
                          style={{ width: `${sector.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Recent Financed Invoices</h3>
              
              {recentInvoices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No financed invoices yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-navy rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-cyan/10 rounded-full flex items-center justify-center">
                            <span className="text-cyan text-sm">📄</span>
                          </div>
                          <div>
                            <p className="font-medium">{invoice.invoice_number}</p>
                            <p className="text-sm text-gray-400">{invoice.msme_company_name} → {invoice.buyer_name}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-cyan">{formatAmount(invoice.amount)}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(invoice.financed_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Risk Metrics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Default Rate</span>
                  <span className="font-bold text-emerald">{(stats?.default_rate && stats.default_rate > 0) ? `${stats.default_rate.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg. Days to Payment</span>
                  <span className="font-bold">{(stats?.avg_payment_days && stats.avg_payment_days > 0) ? stats.avg_payment_days : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Portfolio Diversity</span>
                  <span className="font-bold text-cyan">
                    {stats && stats.active_invoices > 10 ? 'High' : stats && stats.active_invoices > 5 ? 'Medium' : 'Low'}
                  </span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-display text-xl font-bold mb-4">Upcoming Payments</h3>
              <div className="text-center py-8 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <p className="text-sm">Payment schedule coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
