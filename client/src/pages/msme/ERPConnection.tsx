import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { getERPConnections, apiRequest, disconnectERP } from '../../utils/api';

interface ERPConnection {
  id: number;
  erp_type: string;
  base_url: string;
  database: string;
  is_active: boolean;
  last_sync: string | null;
  created_at: string;
}

export default function ERPConnection() {
  const [connections, setConnections] = useState<ERPConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    baseUrl: 'http://localhost:8069',
    database: 'invoice_chain',
    username: 'admin',
    password: ''
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getERPConnections();
      
      if (response.success) {
        setConnections(response.connections || []);
      } else {
        setError(response.message || 'Failed to load ERP connections');
      }
    } catch (err: any) {
      console.error('Failed to fetch connections:', err);
      setError(err.message || 'Failed to load ERP connections');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiRequest('/api/erp/connect', {
        method: 'POST',
        body: JSON.stringify({
          erpType: 'odoo',
          baseUrl: formData.baseUrl,
          database: formData.database,
          username: formData.username,
          password: formData.password
        })
      });

      if (response.success) {
        setSuccess('ERP connected successfully!');
        setShowForm(false);
        setFormData({ ...formData, password: '' });
        fetchConnections();
      } else {
        // Handle specific error cases
        if (response.error === 'ERP authentication failed') {
          setError('Invalid credentials. Please check your username and password and try again.');
        } else if (response.details) {
          setError(`Connection failed: ${response.details}`);
        } else {
          setError(response.message || 'Failed to connect to ERP. Please check your credentials and try again.');
        }
      }
    } catch (err: any) {
      // Handle network or other errors
      if (err.message.includes('fetch')) {
        setError('Cannot connect to ERP server. Please check the URL and ensure the server is running.');
      } else {
        setError(err.message || 'Failed to connect to ERP. Please try again.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    if (!confirm('Are you sure you want to disconnect this ERP? This will stop automatic invoice syncing.')) {
      return;
    }

    setDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await disconnectERP(connectionId);

      if (response.success) {
        setSuccess('ERP disconnected successfully!');
        fetchConnections();
      } else {
        setError(response.message || 'Failed to disconnect ERP');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect ERP');
    } finally {
      setDisconnecting(false);
    }
  };

  const activeConnection = connections.find(c => c.is_active);
  const hasConnection = connections.length > 0;

  if (loading) {
    return (
      <DashboardLayout role="msme">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-cyan mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-400">Loading ERP connections...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="msme">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-4xl font-bold mb-2">ERP Integration</h1>
          <p className="text-gray-400">Connect your ERP system to automatically sync invoices</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-emerald-400">
            {success}
          </div>
        )}

        {/* Connection Status */}
        {hasConnection && activeConnection ? (
          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-bold mb-2">Connected ERP</h3>
                <p className="text-gray-400 text-sm">Your ERP system is connected and ready to sync</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="badge-success">Connected</span>
                <button
                  onClick={() => handleDisconnect(activeConnection.id)}
                  disabled={disconnecting}
                  className="btn-secondary text-sm px-3 py-1.5 bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Disconnect ERP"
                >
                  {disconnecting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Disconnect
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-navy rounded-lg">
                <div className="w-16 h-16 bg-cyan/10 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">Odoo ERP</h4>
                  <p className="text-gray-400 text-sm">{activeConnection.base_url}</p>
                  <p className="text-gray-500 text-xs mt-1">Database: {activeConnection.database}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-navy-lighter rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Status</p>
                  <p className="font-bold text-emerald">Active</p>
                </div>
                <div className="p-4 bg-navy-lighter rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Connected Since</p>
                  <p className="font-mono text-sm">
                    {new Date(activeConnection.created_at).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="p-4 bg-navy-lighter rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Last Sync</p>
                  <p className="font-mono text-sm">
                    {activeConnection.last_sync 
                      ? new Date(activeConnection.last_sync).toLocaleString('en-IN')
                      : 'Not synced yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* No Connection - Show Connect Option */
          <div className="card">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-cyan/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">Connect Your ERP</h3>
              <p className="text-gray-400 mb-6">
                Connect your Odoo accounting system to sync invoices automatically
              </p>
              
              {!showForm ? (
                <button 
                  onClick={() => setShowForm(true)}
                  className="btn-primary"
                >
                  Connect Odoo ERP
                </button>
              ) : null}
            </div>

            {showForm && (
              <form onSubmit={handleConnect} className="mt-6 space-y-4 border-t border-navy-lighter pt-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Odoo URL</label>
                  <input
                    type="url"
                    className="input w-full"
                    placeholder="http://localhost:8069"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">The base URL of your Odoo instance</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Database Name</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="invoice_chain"
                    value={formData.database}
                    onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Odoo database name</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    className="input w-full"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Odoo password (encrypted and stored securely)</p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    disabled={connecting}
                  >
                    {connecting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </>
                    ) : (
                      'Connect ERP'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ ...formData, password: '' });
                    }}
                    className="btn-secondary"
                    disabled={connecting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Supported ERP Systems */}
        <div className="card">
          <h3 className="font-display text-xl font-bold mb-4">Supported ERP Systems</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-navy-lighter rounded-lg border-2 border-cyan/30">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-cyan/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-bold">Odoo ERP</h4>
              </div>
              <p className="text-sm text-gray-400">
                Connect your Odoo accounting system to automatically sync invoices, customers, and transactions.
              </p>
            </div>

            <div className="p-4 bg-navy-lighter rounded-lg opacity-50">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-10 h-10 bg-gray-600/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="font-bold text-gray-500">SAP (Coming Soon)</h4>
              </div>
              <p className="text-sm text-gray-500">
                SAP integration will be available in the next release.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="card">
          <h3 className="font-display text-xl font-bold mb-4">Benefits of ERP Integration</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">Automatic Invoice Sync</p>
                <p className="text-sm text-gray-400">Invoices are automatically synced from your ERP to the blockchain</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">Real-time Data</p>
                <p className="text-sm text-gray-400">Always have up-to-date invoice information</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">Secure Connection</p>
                <p className="text-sm text-gray-400">Your credentials are encrypted and stored securely</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-cyan flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="font-medium">No Manual Entry</p>
                <p className="text-sm text-gray-400">Eliminate manual data entry and reduce errors</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
