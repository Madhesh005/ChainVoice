export type UserRole = 'msme' | 'lender' | 'regulator';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'pending' | 'verified' | 'financed' | 'paid' | 'rejected';
  buyerName: string;
  sellerName: string;
  description: string;
  blockchainTxHash?: string;
  fabTokens?: number;
}

export interface FinancingRequest {
  id: string;
  invoiceId: string;
  requestedAmount: number;
  interestRate: number;
  status: 'pending' | 'approved' | 'rejected' | 'disbursed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  role: UserRole;
  details: string;
  txHash?: string;
}
