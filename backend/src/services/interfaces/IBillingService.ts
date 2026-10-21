import { 
  StorageInvoice, 
  CreateInvoiceInput, 
  BillingSummary, 
  PaymentRecord, 
  RecordPaymentInput,
  BillingReconciliationReport
} from "@/types/billing";

export interface IBillingService {
  getInvoices(): Promise<StorageInvoice[]>;
  getInvoiceById(id: string): Promise<StorageInvoice | null>;
  createInvoice(input: CreateInvoiceInput): Promise<StorageInvoice>;
  updateInvoice(id: string, input: Partial<CreateInvoiceInput>): Promise<StorageInvoice>;
  issueInvoice(id: string): Promise<StorageInvoice>;
  voidInvoice(id: string): Promise<StorageInvoice>;
  cancelInvoice(id: string): Promise<StorageInvoice>;
  recordPayment(input: RecordPaymentInput): Promise<StorageInvoice>;
  getCustomerInvoices(customerId: string): Promise<StorageInvoice[]>;
  getContractInvoices(contractId: string): Promise<StorageInvoice[]>;
  getBillingSummary(): Promise<BillingSummary>;
  getInvoicePaymentHistory(invoiceId: string): Promise<PaymentRecord[]>;
  reconcileBillingWithStorage(customerId?: string): Promise<BillingReconciliationReport>;
}
