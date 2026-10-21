export type PortalSyncStatus = 'SYNCED' | 'PENDING' | 'FAILED' | 'NOT_SYNCED';

export interface CustomerPortalStorageSummary {
  customerId: string;
  customerName: string;
  customerCode: string;
  accountType: 'INDIVIDUAL' | 'CORPORATE';
  storageStatus: 'ACTIVE' | 'INACTIVE';
  activeAllocationsCount: number;
  totalOccupiedSqFt: number;
  activeContractsCount: number;
  outstandingBalance: number;
  syncStatus: PortalSyncStatus;
  lastSyncedAt?: string;
}

export interface CustomerPortalContract {
  contractCode: string;
  customerName: string;
  contractType: string;
  startDate: string;
  endDate: string;
  storageRate: number;
  rateUnit: string;
  billingFrequency: string;
  currency: string;
  status: string;
}

export interface CustomerPortalInvoice {
  invoiceNumber: string;
  contractCode: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  status: string;
}

export interface CustomerPortalDocument {
  documentCode: string;
  title: string;
  documentType: string;
  issueDate: string;
  expiryDate?: string;
  status: string;
}

export interface PortalSyncResult {
  success: boolean;
  entityId: string;
  entityType: 'CUSTOMER' | 'CONTRACT' | 'INVOICE';
  syncedAt: string;
  message: string;
}
