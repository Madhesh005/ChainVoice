import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/StatCard';

export default function Analytics() {
  return (
    <DashboardLayout role="regulator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Cross-Lender Analytics</h1>
          <p className="text-gray-400">System-wide insights and performance metrics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Volume" value="$45.2M" icon="💰" trend="up" trendValue="+22.5%" />
          <StatCard title="Avg. Interest Rate" value="3.8%" icon="📈" />
          <StatCard title="Verification Time" value="4.2h" icon="⏱️" trend="down" trendValue="-15%" />
          <StatCard title="Success Rate" value="94.2%" icon="✓" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Top Lenders by Volume</h3>
            <div className="space-y-4">
              {[
                { name: 'FirstBank Financial', volume: 12500000, share: 28 },
                { name: 'GlobalFinance Corp', volume: 9800000, share: 22 },
                { name: 'SecureBank Ltd', volume: 8200000, share: 18 },
                { name: 'TrustLend Inc', volume: 6500000, share: 14 },
                { name: 'Others', volume: 8200000, share: 18 },
              ].map((lender) => (
                <div key={lender.name}>
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">{lender.name}</span>
                    <span className="text-gray-400">${(lender.volume / 1000000).toFixed(1)}M ({lender.share}%)</span>
                  </div>
                  <div className="w-full bg-navy-lighter rounded-full h-2">
                    <div 
                      className="bg-cyan h-2 rounded-full transition-all duration-500"
                      style={{ width: `${lender.share * 3.5}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Industry Distribution</h3>
            <div className="space-y-3">
              {[
                { industry: 'Technology', percentage: 32, color: 'cyan' },
                { industry: 'Manufacturing', percentage: 28, color: 'emerald' },
                { industry: 'Retail', percentage: 22, color: 'amber' },
                { industry: 'Services', percentage: 18, color: 'crimson' },
              ].map((item) => (
                <div key={item.industry} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full bg-${item.color}`}></div>
                    <span>{item.industry}</span>
                  </div>
                  <span className="font-bold">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-xl font-bold mb-4">Monthly Financing Trends</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[45, 52, 58, 62, 68, 75, 82, 88, 92, 95, 98, 100].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-cyan to-cyan-dark rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                  style={{ height: `${height}%` }}
                  title={`Month ${i + 1}: $${(height * 450).toLocaleString()}`}
                ></div>
                <p className="text-xs text-gray-400 mt-2">M{i + 1}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Risk Indicators</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">System Default Rate</span>
                <span className="font-bold text-emerald">1.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fraud Detection Rate</span>
                <span className="font-bold text-emerald">99.7%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Recovery Time</span>
                <span className="font-bold">32 days</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Compliance Score</h3>
            <div className="text-center py-4">
              <div className="text-6xl font-bold text-emerald mb-2">98.5</div>
              <p className="text-gray-400">Out of 100</p>
              <div className="mt-4 w-full bg-navy-lighter rounded-full h-2">
                <div className="bg-emerald h-2 rounded-full" style={{ width: '98.5%' }}></div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Network Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Avg. Block Time</span>
                <span className="font-bold">12.5s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gas Price</span>
                <span className="font-bold">25 Gwei</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network Load</span>
                <span className="font-bold text-emerald">Low</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
