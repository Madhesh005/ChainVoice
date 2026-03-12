import Navbar from '../../components/Navbar';

export default function BlockchainExplorer() {
  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-4xl font-bold mb-2">Blockchain Explorer</h1>
            <p className="text-gray-400">Public transaction explorer for ChainVoice network</p>
          </div>

          <div className="card">
            <input
              type="text"
              className="input w-full"
              placeholder="Search by transaction hash, block number, or address..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-center">
              <p className="text-gray-400 text-sm mb-2">Latest Block</p>
              <p className="text-3xl font-mono font-bold text-cyan">15,234,892</p>
            </div>
            <div className="card text-center">
              <p className="text-gray-400 text-sm mb-2">Total Transactions</p>
              <p className="text-3xl font-mono font-bold">12,456</p>
            </div>
            <div className="card text-center">
              <p className="text-gray-400 text-sm mb-2">Avg. Block Time</p>
              <p className="text-3xl font-mono font-bold">12.5s</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-display text-xl font-bold mb-4">Recent Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-lighter">
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Tx Hash</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Block</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">From</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b border-navy-lighter hover:bg-navy-lighter transition-colors">
                      <td className="py-4 px-4 font-mono text-cyan text-sm">0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 6)}</td>
                      <td className="py-4 px-4 font-mono">{15234892 - i}</td>
                      <td className="py-4 px-4">
                        <span className="badge-info">Invoice</span>
                      </td>
                      <td className="py-4 px-4 font-mono text-sm text-gray-400">0x{Math.random().toString(16).slice(2, 10)}...</td>
                      <td className="py-4 px-4 text-gray-400 text-sm">{i * 15} secs ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
