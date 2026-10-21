export type InvoiceStatus = 
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'CANCELLED';

export type PaymentStatus = InvoiceStatus;

export type PaymentMethod = 
  | 'BANK_TRANSFER'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'CHEQUE'
  | 'OTHER';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  amount: number;
  allocationId?: string;
}

export interface StorageInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  contractId: string;
  contractCode: string;
  allocationIds: string[];
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentStatus?: 'PAID' | 'PENDING' | 'OVERDUE' | 'CANCELLED';
  lineItems: InvoiceLineItem[];
  notes?: string;
  portalInvoiceUrl?: string;
  portalRefId?: string;
  portalSyncStatus?: 'SYNCED' | 'PENDING' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export type DiscrepancyType = 
  | 'UNBILLED_ALLOCATION'
  | 'RATE_CAPACITY_MISMATCH'
  | 'PERIOD_MISMATCH'
  | 'UNLINKED_LINE_ITEM'
  | 'OVERDUE_PAYMENT_MISMATCH';

export interface BillingReconciliationDiscrepancy {
  id: string;
  discrepancyType: DiscrepancyType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  customerId: string;
  customerName: string;
  allocationId?: string;
  allocationCode?: string;
  contractId?: string;
  contractCode?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  description: string;
  expectedValue?: string;
  actualValue?: string;
  detectedAt: string;
}

export interface BillingReconciliationReport {
  totalAllocationsChecked: number;
  totalInvoicesChecked: number;
  discrepanciesCount: number;
  discrepancies: BillingReconciliationDiscrepancy[];
  reconciledAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export interface BillingSummary {
  totalInvoices: number;
  draftInvoices: number;
  issuedInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalSubtotal: number;
  totalTax: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdueAmount: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  contractId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issueDate: string;
  dueDate: string;
  currency?: string;
  taxRate?: number;
  lineItems: {
    description: string;
    quantity: number;
    unit: string;
    unitRate: number;
    allocationId?: string;
  }[];
  notes?: string;
}

export interface RecordPaymentInput {
  invoiceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy?: string;
}
