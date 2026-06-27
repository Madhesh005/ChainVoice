/**
 * API Utility
 * Handles authenticated requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Base API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // Additional fields that might be returned directly at root level
  [key: string]: unknown;
}

// Specific response types for different endpoints
export interface LoginResponse extends ApiResponse {
  token?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    company_name?: string;
    lender_name?: string;
    bank_name?: string;
    [key: string]: unknown;
  };
}

export interface NotificationsResponse extends ApiResponse {
  notifications?: Array<{
    id: number;
    invoice_giid: string;
    invoice_number: string;
    lender_id: string;
    action_type: string;
    message: string;
    is_read: boolean;
    created_at: string;
    [key: string]: unknown;
  }>;
  unread_count?: number;
}

export interface InvoicesResponse extends ApiResponse {
  invoices?: Array<{
    id: string | number;
    invoice_number: string;
    amount: number;
    request_id?: number;
    request_status?: string;
    request_date?: string;
    lender_id?: string;
    invoice_id?: number;
    buyer_name?: string;
    seller_gstin?: string;
    giid?: string;
    ipfs_hash?: string;
    document_hash?: string;
    blockchain_status?: string;
    msme_company_name?: string;
    currency?: string;
    status?: string;
    invoice_date?: string;
    financed_date?: string;
    financing_status?: string;
    [key: string]: unknown;
  }>;
  count?: number;
}

export interface StatisticsResponse extends ApiResponse {
  statistics?: {
    pending_verification: number;
    active_financing: number;
    portfolio_size: number;
    default_rate: number;
    total_invoices: number;
    [key: string]: unknown;
  };
}

export interface ActivitiesResponse extends ApiResponse {
  activities?: Array<{
    id: number;
    lender_identifier: string;
    giid: string;
    action: string;
    description: string;
    created_at: string;
    timestamp?: string;
    [key: string]: unknown;
  }>;
}

export interface InvoiceResponse extends ApiResponse {
  invoice?: {
    id: string | number;
    invoice_number: string;
    amount: number;
    buyer_name?: string;
    seller_name?: string;
    seller_gstin?: string;
    currency?: string;
    giid?: string;
    issue_date?: string;
    due_date?: string;
    ipfs_hash?: string;
    document_hash?: string;
    blockchain_tx_hash?: string;
    blockchain_timestamp?: string;
    blockchain_status?: string;
    request_status?: string;
    request_date?: string;
    msme_company_name?: string;
    msme_contact_person?: string;
    [key: string]: unknown;
  };
  seller_history?: {
    total_invoices: number;
    verified: number;
    rejected: number;
    success_rate: number;
  };
}

export interface IdentityResponse extends ApiResponse {
  status?: string;
  blockchain_status?: string;
  [key: string]: unknown;
}

export interface PortfolioStatsResponse extends ApiResponse {
  portfolio_stats?: {
    total_financed: number;
    active_invoices: number;
    active_financing: number;
    avg_interest_rate?: number;
    expected_returns?: number;
    default_rate?: number;
    avg_payment_days?: number;
    [key: string]: unknown;
  };
}

export interface SectorsResponse extends ApiResponse {
  sectors?: Array<{
    sector: string;
    count: number;
    amount: number;
    percentage: number;
    [key: string]: unknown;
  }>;
}

export interface ConnectionsResponse extends ApiResponse {
  connections?: Array<{
    id: number;
    erp_type: string;
    base_url: string;
    database: string;
    is_active: boolean;
    last_sync: string;
    created_at: string;
    [key: string]: unknown;
  }>;
  details?: string;
}

// MSME Dashboard Response
export interface DashboardResponse extends ApiResponse {
  data?: {
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
      metadata: unknown;
      created_at: string;
    }>;
  };
}

// Invoice Detail Response
export interface InvoiceDetailResponse extends ApiResponse {
  data?: {
    invoice: {
      id: number;
      erp_invoice_id?: number;
      invoice_number: string;
      buyer_name: string;
      buyer_gstin: string;
      seller_name: string;
      seller_gstin: string;
      invoice_date: string;
      amount: number;
      gst_amount: number;
      total_amount: number;
      status: string;
      giid?: string;
      ipfs_hash?: string;
      document_hash?: string;
      blockchain_tx_hash?: string;
      blockchain_block_number?: string;
      blockchain_timestamp?: string;
      blockchain_status?: string;
      created_at: string;
    };
    blockchain?: {
      status: string;
      verified: boolean;
      locked_by?: string;
      lender_id?: string;
      financed_at?: string;
      closed_at?: string;
      created_at?: string;
      updated_at?: string;
      error?: string | null;
    };
    lenders?: Array<{
      id: string;
      name: string;
      type: string;
    }>;
    giid?: string;
    ipfs_cid?: string;
    document_hash?: string;
    status?: string;
    reconciled?: boolean;
  };
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
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add custom headers if provided
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

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
): Promise<LoginResponse> {
  const endpoint = role === 'admin' ? '/api/auth/admin/login' : `/api/auth/${role}/login`;
  
  const response = await apiRequest<LoginResponse>(endpoint, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }) as LoginResponse;

  if (response.success && response.token) {
    setToken(response.token);
    if (response.user) {
      setUser(response.user);
    }
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
export async function getMSMEDashboard(): Promise<DashboardResponse> {
  return apiRequest<DashboardResponse>('/api/msme/dashboard') as Promise<DashboardResponse>;
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
export async function getInvoiceDetails(id: string): Promise<InvoiceDetailResponse> {
  return apiRequest<InvoiceDetailResponse>(`/api/erp/invoices/${id}/details`) as Promise<InvoiceDetailResponse>;
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
  
  console.log(`📥 Downloading PDF for invoice ID: ${id}`);
  
  const response = await fetch(`${API_BASE_URL}/api/erp/invoices/${id}/pdf`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log(`📥 PDF download response status: ${response.status}`);
  console.log(`📥 PDF download response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    let errorMessage = 'Failed to download PDF';
    
    try {
      // Try to parse JSON error response
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      console.error('❌ PDF download error response:', errorData);
    } catch (parseError) {
      // If JSON parsing fails, try to get text
      try {
        const errorText = await response.text();
        console.error('❌ PDF download error text:', errorText);
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (textError) {
        console.error('❌ Could not parse error response:', textError);
      }
    }
    
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  console.log(`✓ PDF downloaded successfully: ${blob.size} bytes`);
  
  return blob;
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
export async function registerInvoiceIdentity(erpInvoiceId: number): Promise<InvoiceDetailResponse> {
  return apiRequest<InvoiceDetailResponse>(`/invoice/${erpInvoiceId}`) as Promise<InvoiceDetailResponse>;
}

/**
 * Get available lenders for financing
 */
export async function getAvailableLenders(): Promise<InvoiceDetailResponse> {
  return apiRequest<InvoiceDetailResponse>('/api/financing/lenders') as Promise<InvoiceDetailResponse>;
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
export async function getLenderDashboardStats(): Promise<ApiResponse> {
  // No longer needs lenderIdentifier - backend uses authenticated user
  return apiRequest(`/api/financing/lender/statistics`);
}

/**
 * Get pending verification invoices for lender
 */
export async function getLenderPendingInvoices(limit?: number): Promise<ApiResponse> {
  // No longer needs lenderIdentifier - backend uses authenticated user
  // This now calls the main lender invoices endpoint which returns all financing requests
  const query = limit ? `?limit=${limit}` : '';
  return apiRequest(`/api/financing/lender/invoices${query}`);
}

/**
 * Get recent lender activity
 */
export async function getLenderActivity(limit?: number): Promise<ApiResponse> {
  // No longer needs lenderIdentifier - backend uses authenticated user
  const query = limit ? `?limit=${limit}` : '';
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
 * Get portfolio statistics
 */
export async function getPortfolioStats(): Promise<ApiResponse> {
  return apiRequest('/api/lender/portfolio/stats');
}

/**
 * Get portfolio sector breakdown
 */
export async function getPortfolioSectors(): Promise<ApiResponse> {
  return apiRequest('/api/lender/portfolio/sectors');
}

/**
 * Get financed invoices for portfolio
 */
export async function getPortfolioInvoices(status?: string, limit?: number, offset?: number): Promise<ApiResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/api/lender/portfolio/invoices${query}`);
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
export async function getNotifications(): Promise<NotificationsResponse> {
  return apiRequest<NotificationsResponse>('/api/notifications') as Promise<NotificationsResponse>;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number): Promise<ApiResponse> {
  return apiRequest(`/api/notifications/read/${notificationId}`, {
    method: 'POST',
  });
}

/**
 * Get lender dashboard statistics  
 */
export async function getLenderDashboardStatsTyped(): Promise<StatisticsResponse> {
  return apiRequest<StatisticsResponse>(`/api/lender/dashboard/stats`) as Promise<StatisticsResponse>;
}

/**
 * Get pending verification invoices for lender
 */
export async function getLenderPendingInvoicesTyped(limit?: number): Promise<InvoicesResponse> {
  const query = limit ? `?limit=${limit}` : '';
  return apiRequest<InvoicesResponse>(`/api/lender/invoices/pending${query}`) as Promise<InvoicesResponse>;
}

/**
 * Get recent lender activity
 */
export async function getLenderActivityTyped(limit?: number): Promise<ActivitiesResponse> {
  const query = limit ? `?limit=${limit}` : '';
  return apiRequest<ActivitiesResponse>(`/api/lender/activity${query}`) as Promise<ActivitiesResponse>;
}

/**
 * Get invoice details by GIID for lender verification
 */
export async function getLenderInvoiceByGIIDTyped(giid: string): Promise<InvoiceResponse> {
  return apiRequest<InvoiceResponse>(`/api/lender/invoice/${giid}`) as Promise<InvoiceResponse>;
}

/**
 * Get invoice details by GIID for lender (non-typed version for backward compatibility)
 */
export async function getLenderInvoiceByGIID(giid: string): Promise<InvoiceResponse> {
  return getLenderInvoiceByGIIDTyped(giid);
}

/**
 * Get blockchain identity status by GIID
 */
export async function getBlockchainIdentityTyped(giid: string): Promise<IdentityResponse> {
  return apiRequest<IdentityResponse>(`/identity/${giid}`) as Promise<IdentityResponse>;
}

/**
 * Get portfolio statistics
 */
export async function getPortfolioStatsTyped(): Promise<PortfolioStatsResponse> {
  return apiRequest<PortfolioStatsResponse>('/api/lender/portfolio/stats') as Promise<PortfolioStatsResponse>;
}

/**
 * Get portfolio sector breakdown
 */
export async function getPortfolioSectorsTyped(): Promise<SectorsResponse> {
  return apiRequest<SectorsResponse>('/api/lender/portfolio/sectors') as Promise<SectorsResponse>;
}

/**
 * Get financed invoices for portfolio
 */
export async function getPortfolioInvoicesTyped(status?: string, limit?: number, offset?: number): Promise<InvoicesResponse> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<InvoicesResponse>(`/api/lender/portfolio/invoices${query}`) as Promise<InvoicesResponse>;
}

/**
 * Get ERP connections
 */
export async function getERPConnectionsTyped(): Promise<ConnectionsResponse> {
  return apiRequest<ConnectionsResponse>('/api/erp/connections') as Promise<ConnectionsResponse>;
}

/**
 * Connect to ERP system
 */
export async function connectERPTyped(data: {
  erpType: string;
  baseUrl: string;
  database: string;
  username: string;
  password: string;
}): Promise<ConnectionsResponse> {
  return apiRequest<ConnectionsResponse>('/api/erp/connect', {
    method: 'POST',
    body: JSON.stringify(data),
  }) as Promise<ConnectionsResponse>;
}

/**
 * Get invoices
 */
export async function getInvoicesTyped(params?: { status?: string }): Promise<InvoicesResponse> {
  const queryString = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : '';
  return apiRequest<InvoicesResponse>(`/api/erp/invoices${queryString}`) as Promise<InvoicesResponse>;
}