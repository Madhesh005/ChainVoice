/**
 * API Utility
 * Handles authenticated requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get JWT token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem('token');
}

/**
 * Store JWT token in localStorage
 */
export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

/**
 * Remove JWT token from localStorage
 */
export function removeToken(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

/**
 * Get user data from localStorage
 */
export function getUser(): any {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Store user data in localStorage
 */
export function setUser(user: any): void {
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Make authenticated API request
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error(`Server returned non-JSON response. Status: ${response.status}`);
    }

    const data = await response.json();

    // Handle authentication errors (but not for ERP connection endpoint)
    // ERP connection errors should be handled by the calling component
    if ((response.status === 401 || response.status === 403) && !endpoint.includes('/api/erp/connect')) {
      // Only redirect to login if it's an actual auth token issue
      if (data.error === 'AUTH_REQUIRED' || data.error === 'AUTH_FAILED' || data.error === 'PERMISSION_DENIED') {
        removeToken();
        window.location.href = '/auth/login';
        throw new Error('Authentication failed. Please login again.');
      }
    }
    
    // Return data even if not ok - let the calling component handle the error
    return data;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Login user and store token
 */
export async function login(
  email: string,
  password: string,
  role: 'msme' | 'lender' | 'admin'
): Promise<ApiResponse> {
  const endpoint = role === 'admin' ? '/api/auth/admin/login' : `/api/auth/${role}/login`;
  
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.success && response.token) {
    setToken(response.token);
    setUser(response.user);
  }

  return response;
}

/**
 * Register MSME user
 */
export async function registerMSME(data: {
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  gstin: string;
  password: string;
}): Promise<ApiResponse> {
  return apiRequest('/api/auth/msme/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Register Lender user
 */
export async function registerLender(data: {
  institution_name: string;
  contact_person: string;
  email: string;
  phone: string;
  license_number: string;
  password: string;
}): Promise<ApiResponse> {
  return apiRequest('/api/auth/lender/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Logout user
 */
export function logout(): void {
  removeToken();
  window.location.href = '/auth/login';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Get MSME dashboard data
 */
export async function getMSMEDashboard(): Promise<ApiResponse> {
  return apiRequest('/api/msme/dashboard');
}

/**
 * Get MSME profile
 */
export async function getMSMEProfile(): Promise<ApiResponse> {
  return apiRequest('/api/msme/profile');
}

/**
 * Get invoices
 */
export async function getInvoices(params?: { status?: string }): Promise<ApiResponse> {
  const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
  return apiRequest(`/api/erp/invoices${queryString}`);
}

/**
 * Get single invoice by ID
 */
export async function getInvoiceById(id: string): Promise<ApiResponse> {
  return apiRequest(`/api/erp/invoices/${id}`);
}

/**
 * Get invoice details by database ID (resilient to blockchain failures)
 */
export async function getInvoiceDetails(id: string): Promise<ApiResponse> {
  return apiRequest(`/api/erp/invoices/${id}/details`);
}

/**
 * Get invoice by database ID (direct route, no auth required for testing)
 */
export async function getInvoiceByDatabaseId(id: string): Promise<ApiResponse> {
  return apiRequest(`/api/invoices/${id}`);
}

/**
 * Download invoice PDF
 */
export async function downloadInvoicePDF(id: string): Promise<Blob> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/erp/invoices/${id}/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to download PDF' }));
    throw new Error(errorData.error || 'Failed to download PDF');
  }

  return response.blob();
}

/**
 * Get ERP statistics
 */
export async function getERPStatistics(): Promise<ApiResponse> {
  return apiRequest('/api/erp/statistics');
}

/**
 * Get ERP connections
 */
export async function getERPConnections(): Promise<ApiResponse> {
  return apiRequest('/api/erp/connections');
}

/**
 * Connect to ERP system
 */
export async function connectERP(data: {
  erpType: string;
  baseUrl: string;
  database: string;
  username: string;
  password: string;
}): Promise<ApiResponse> {
  return apiRequest('/api/erp/connect', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Disconnect ERP connection
 */
export async function disconnectERP(connectionId: number): Promise<ApiResponse> {
  return apiRequest(`/api/erp/connections/${connectionId}`, {
    method: 'DELETE',
  });
}

/**
 * Sync invoices from ERP
 */
export async function syncInvoices(erpType: string): Promise<ApiResponse> {
  return apiRequest('/api/erp/sync', {
    method: 'POST',
    body: JSON.stringify({ erpType }),
  });
}

/**
 * Register invoice identity on blockchain (Request Financing)
 * This triggers: canonical generation → hash → IPFS upload → Hyperledger registration
 */
export async function registerInvoiceIdentity(erpInvoiceId: number): Promise<ApiResponse> {
  return apiRequest(`/invoice/${erpInvoiceId}`);
}

/**
 * Get available lenders for financing
 */
export async function getAvailableLenders(): Promise<ApiResponse> {
  return apiRequest('/api/financing/lenders');
}

/**
 * Request financing with selected lender
 */
export async function requestFinancing(data: {
  giid: string;
  lender_id: string;
}): Promise<ApiResponse> {
  return apiRequest('/api/financing/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get invoices accessible to lender
 */
export async function getLenderInvoices(lenderIdentifier?: string): Promise<ApiResponse> {
  const query = lenderIdentifier ? `?lender_identifier=${lenderIdentifier}` : '';
  return apiRequest(`/api/financing/lender/invoices${query}`);
}

/**
 * Get lender statistics
 */
export async function getLenderStatistics(lenderIdentifier?: string): Promise<ApiResponse> {
  const query = lenderIdentifier ? `?lender_identifier=${lenderIdentifier}` : '';
  return apiRequest(`/api/financing/lender/statistics${query}`);
}

/**
 * Get lender dashboard statistics
 */
export async function getLenderDashboardStats(lenderIdentifier?: string): Promise<ApiResponse> {
  const query = lenderIdentifier ? `?lender_identifier=${lenderIdentifier}` : '';
  return apiRequest(`/api/lender/dashboard/stats${query}`);
}

/**
 * Get pending verification invoices for lender
 */
export async function getLenderPendingInvoices(lenderIdentifier?: string, limit?: number): Promise<ApiResponse> {
  const params = new URLSearchParams();
  if (lenderIdentifier) params.append('lender_identifier', lenderIdentifier);
  if (limit) params.append('limit', limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/lender/invoices/pending${query}`);
}

/**
 * Get recent lender activity
 */
export async function getLenderActivity(lenderIdentifier?: string, limit?: number): Promise<ApiResponse> {
  const params = new URLSearchParams();
  if (lenderIdentifier) params.append('lender_identifier', lenderIdentifier);
  if (limit) params.append('limit', limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/lender/activity${query}`);
}

/**
 * Get all lender invoices with optional filters
 */
export async function getAllLenderInvoices(lenderIdentifier?: string, status?: string, limit?: number): Promise<ApiResponse> {
  const params = new URLSearchParams();
  if (lenderIdentifier) params.append('lender_identifier', lenderIdentifier);
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/lender/invoices${query}`);
}
/**
 * Get invoice details by GIID for lender verification
 */
export async function getLenderInvoiceByGIID(giid: string): Promise<ApiResponse> {
  return apiRequest(`/api/financing/lender/invoice/${giid}`);
}

/**
 * Approve and lock invoice (Lender verification)
 */
export async function approveInvoice(data: {
  giid: string;
}): Promise<ApiResponse> {
  return apiRequest('/api/financing/lock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Reject invoice (Lender verification)
 */
export async function rejectInvoice(data: {
  giid: string;
}): Promise<ApiResponse> {
  return apiRequest('/api/financing/unlock', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get blockchain identity status by GIID
 */
export async function getBlockchainIdentity(giid: string): Promise<ApiResponse> {
  return apiRequest(`/identity/${giid}`);
}

/**
 * Get notifications for MSME user
 */
export async function getNotifications(): Promise<ApiResponse> {
  return apiRequest('/api/notifications');
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<ApiResponse> {
  return apiRequest(`/api/notifications/read/${notificationId}`, {
    method: 'POST',
  });
}