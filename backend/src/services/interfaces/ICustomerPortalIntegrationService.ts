import { 
  CustomerPortalStorageSummary, 
  CustomerPortalContract, 
  CustomerPortalInvoice, 
  CustomerPortalDocument, 
  PortalSyncResult 
} from "@/types/portal";

export interface ICustomerPortalIntegrationService {
  getCustomerPortalSummary(customerId: string): Promise<CustomerPortalStorageSummary | null>;
  getPortalContracts(customerId: string): Promise<CustomerPortalContract[]>;
  getPortalInvoices(customerId: string): Promise<CustomerPortalInvoice[]>;
  getPortalDocuments(customerId: string): Promise<CustomerPortalDocument[]>;
  syncCustomerStorageStatus(customerId: string): Promise<PortalSyncResult>;
  syncInvoiceStatus(invoiceId: string): Promise<PortalSyncResult>;
  syncContractStatus(contractId: string): Promise<PortalSyncResult>;
}
