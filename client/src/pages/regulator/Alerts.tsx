import DashboardLayout from '../../layouts/DashboardLayout';

const mockAlerts = [
  { id: '1', type: 'Duplicate Invoice Attempt', severity: 'high', entity: 'QuickCash Ltd', time: '1 hour ago', status: 'investigating' },
  { id: '2', type: 'Unusual Transaction Pattern', severity: 'medium', entity: 'TechStart Solutions', time: '3 hours ago', status: 'resolved' },
  { id: '3', type: 'High-Value Transaction', severity: 'low', entity: 'GlobalFinance', time: '5 hours ago', status: 'cleared' },
  { id: '4', type: 'Multiple Failed Verifications', severity: 'high', entity: 'FastFund Inc', time: '1 day ago', status: 'investigating' },
];

export default function Alerts() {
  return (
    <DashboardLayout role="regulator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Fraud Alerts</h1>
          <p className="text-gray-400">Monitor and investigate suspicious activities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card text-center border-l-4 border-crimson">
            <p className="text-gray-400 text-sm mb-1">Critical</p>
            <p className="text-3xl font-bold text-crimson">2</p>
          </div>
          <div className="card text-center border-l-4 border-amber">
            <p className="text-gray-400 text-sm mb-1">High</p>
            <p className="text-3xl font-bold text-amber">5</p>
          </div>
          <div className="card text-center border-l-4 border-cyan">
            <p className="text-gray-400 text-sm mb-1">Medium</p>
            <p className="text-3xl font-bold text-cyan">12</p>
          </div>
          <div className="card text-center border-l-4 border-emerald">
            <p className="text-gray-400 text-sm mb-1">Resolved Today</p>
            <p className="text-3xl font-bold text-emerald">8</p>
          </div>
        </div>

        <div className="card">
          <div className="flex gap-4 mb-6">
            <select className="input">
              <option>All Severities</option>
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select className="input">
              <option>All Statuses</option>
              <option>Investigating</option>
              <option>Resolved</option>
              <option>Cleared</option>
            </select>
            <input 
              type="text" 
              className="input flex-1" 
              placeholder="Search alerts..."
            />
          </div>

          <div className="space-y-4">
            {mockAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 bg-navy rounded-lg border-l-4 hover:bg-navy-lighter transition-colors cursor-pointer ${
                  alert.severity === 'high' ? 'border-crimson' : 
                  alert.severity === 'medium' ? 'border-amber' : 'border-cyan'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-display text-lg font-bold">{alert.type}</h3>
                      <span className={`badge-${
                        alert.severity === 'high' ? 'error' : 
                        alert.severity === 'medium' ? 'warning' : 'info'
                      }`}>
                        {alert.severity}
                      </span>
                      <span className={`badge-${
                        alert.status === 'investigating' ? 'warning' : 'success'
                      }`}>
                        {alert.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">Entity: {alert.entity}</p>
                    <p className="text-gray-500 text-xs mt-1">{alert.time}</p>
                  </div>
                  <button className="btn-secondary">Investigate</button>
                </div>
                
                <div className="mt-3 pt-3 border-t border-navy-lighter">
                  <p className="text-sm text-gray-400">
                    Automated fraud detection system flagged this activity for review. 
                    Click investigate to view full details and blockchain evidence.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Alert Trends</h3>
            <div className="h-48 flex items-end justify-between space-x-2">
              {[12, 15, 10, 18, 14, 8, 5].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-crimson to-amber rounded-t-lg"
                    style={{ height: `${height * 5}%` }}
                  ></div>
                  <p className="text-xs text-gray-400 mt-2">Day {i + 1}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Top Alert Types</h3>
            <div className="space-y-3">
              {[
                { type: 'Duplicate Invoice', count: 8 },
                { type: 'Unusual Pattern', count: 6 },
                { type: 'High-Value Transaction', count: 4 },
                { type: 'Failed Verification', count: 3 },
              ].map((item) => (
                <div key={item.type} className="flex justify-between items-center">
                  <span className="text-gray-400">{item.type}</span>
                  <span className="font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
