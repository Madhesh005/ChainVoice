import DashboardLayout from '../../layouts/DashboardLayout';
import StatCard from '../../components/StatCard';

export default function RegulatorDashboard() {
  return (
    <DashboardLayout role="regulator">
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Regulator Dashboard</h1>
          <p className="text-gray-400">Monitor system-wide activity and compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Transactions" value="12,456" icon="📊" trend="up" trendValue="+18.2%" />
          <StatCard title="Active Lenders" value="24" icon="🏦" />
          <StatCard title="Active MSMEs" value="342" icon="🏢" />
          <StatCard title="Fraud Alerts" value="3" icon="🚨" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">System Health</h3>
            <div className="space-y-4">
              {[
                { metric: 'Blockchain Sync', value: '100%', status: 'healthy' },
                { metric: 'Transaction Processing', value: '99.8%', status: 'healthy' },
                { metric: 'Verification Rate', value: '94.2%', status: 'healthy' },
                { metric: 'Default Rate', value: '1.2%', status: 'warning' },
              ].map((item) => (
                <div key={item.metric} className="flex justify-between items-center">
                  <span className="text-gray-400">{item.metric}</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold">{item.value}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      item.status === 'healthy' ? 'bg-emerald' : 'bg-amber'
                    }`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Recent Alerts</h3>
            <div className="space-y-3">
              {[
                { type: 'Suspicious Activity', severity: 'high', time: '1 hour ago' },
                { type: 'Duplicate Invoice Attempt', severity: 'medium', time: '3 hours ago' },
                { type: 'Unusual Transaction Pattern', severity: 'low', time: '1 day ago' },
              ].map((alert, i) => (
                <div key={i} className="p-3 bg-navy rounded-lg border-l-4 border-crimson">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-sm text-gray-400">{alert.time}</p>
                    </div>
                    <span className={`badge-${alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'info'}`}>
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-secondary w-full mt-4">View All Alerts</button>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display text-xl font-bold mb-4">Transaction Volume (Last 7 Days)</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 78, 82, 90, 75, 88, 95].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-gradient-to-t from-cyan to-cyan-dark rounded-t-lg transition-all duration-500 hover:opacity-80"
                  style={{ height: `${height}%` }}
                ></div>
                <p className="text-xs text-gray-400 mt-2">Day {i + 1}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
