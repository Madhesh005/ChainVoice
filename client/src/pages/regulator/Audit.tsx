import DashboardLayout from '../../layouts/DashboardLayout';

const mockAuditLogs = [
  { id: '1', timestamp: '2024-03-08 14:30:22', action: 'Invoice Verified', actor: 'FirstBank Lender', role: 'lender', txHash: '0x7a8f...3d2e' },
  { id: '2', timestamp: '2024-03-08 14:25:15', action: 'Funds Disbursed', actor: 'GlobalFinance', role: 'lender', txHash: '0x9b2c...4f1a' },
  { id: '3', timestamp: '2024-03-08 14:20:08', action: 'Invoice Uploaded', actor: 'TechStart Solutions', role: 'msme', txHash: '0x3e5d...8c7b' },
  { id: '4', timestamp: '2024-03-08 14:15:42', action: 'Financing Approved', actor: 'SecureBank', role: 'lender', txHash: '0x2f4a...9d1c' },
];

export default function Audit() {
  return (
    <DashboardLayout role="regulator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">Audit Log</h1>
          <p className="text-gray-400">Complete blockchain transaction history</p>
        </div>

        <div className="card">
          <div className="flex gap-4 mb-6">
            <input 
              type="text" 
              className="input flex-1" 
              placeholder="Search by transaction hash, actor, or action..."
            />
            <select className="input">
              <option>All Roles</option>
              <option>MSME</option>
              <option>Lender</option>
              <option>Regulator</option>
            </select>
            <select className="input">
              <option>All Actions</option>
              <option>Invoice Uploaded</option>
              <option>Invoice Verified</option>
              <option>Funds Disbursed</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-lighter">
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Actor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Tx Hash</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Details</th>
                </tr>
              </thead>
              <tbody>
                {mockAuditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-navy-lighter hover:bg-navy-lighter transition-colors">
                    <td className="py-4 px-4 text-gray-400 text-sm">{log.timestamp}</td>
                    <td className="py-4 px-4 font-medium">{log.action}</td>
                    <td className="py-4 px-4">{log.actor}</td>
                    <td className="py-4 px-4">
                      <span className={`badge-${log.role === 'lender' ? 'info' : 'success'}`}>
                        {log.role}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono text-cyan text-sm">{log.txHash}</td>
                    <td className="py-4 px-4">
                      <button className="text-cyan hover:underline text-sm">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-400">Showing 1-10 of 12,456 transactions</p>
            <div className="flex gap-2">
              <button className="btn-secondary">Previous</button>
              <button className="btn-secondary">Next</button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
