import { ICustomerPortalIntegrationService } from "../interfaces/ICustomerPortalIntegrationService";
import { 
  CustomerPortalStorageSummary, 
  CustomerPortalContract, 
  CustomerPortalInvoice, 
  CustomerPortalDocument, 
  PortalSyncResult 
} from "@/types/portal";
import { 
  MOCK_CUSTOMERS, 
  MOCK_CONTRACTS, 
  MOCK_INVOICES, 
  MOCK_DOCUMENTS, 
  MOCK_ALLOCATIONS 
} from "./mock-db";

export class MockCustomerPortalIntegrationService implements ICustomerPortalIntegrationService {
  async getCustomerPortalSummary(customerId: string): Promise<CustomerPortalStorageSummary | null> {
    const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
    if (!customer) return null;

    const customerContracts = MOCK_CONTRACTS.filter((c) => c.customerId === customerId && c.status === "ACTIVE");
    const customerInvoices = MOCK_INVOICES.filter((i) => i.customerId === customerId && i.status !== "VOID" && i.status !== "CANCELLED");
    const customerAllocations = MOCK_ALLOCATIONS.filter((a) => a.customerId === customerId && a.status === "ACTIVE");

    const totalOccupiedSqFt = customerAllocations.reduce((sum, a) => sum + a.allocatedCapacity, 0);
    const outstandingBalance = customerInvoices.reduce((sum, i) => sum + i.balanceDue, 0);

    // SECURITY BOUNDARY MAPPING: Exclude all internal staff notes, AI scores, and warehouse operational details
    return {
      customerId: customer.id,
      customerName: customer.name,
      customerCode: customer.code,
      accountType: customer.type,
      storageStatus: customer.status === "ACTIVE" ? "ACTIVE" : "INACTIVE",
      activeAllocationsCount: customerAllocations.length,
      totalOccupiedSqFt,
      activeContractsCount: customerContracts.length,
      outstandingBalance,
      syncStatus: "SYNCED",
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async getPortalContracts(customerId: string): Promise<CustomerPortalContract[]> {
    const customerContracts = MOCK_CONTRACTS.filter(
      (c) => c.customerId === customerId && (c.status === "ACTIVE" || c.status === "EXPIRING_SOON" || c.status === "EXPIRED")
    );

    // Filter to customer-safe DTO representation
    return customerContracts.map((c) => ({
      contractCode: c.contractCode,
      customerName: c.customerName,
      contractType: c.contractType.replace("_", " "),
      startDate: c.startDate,
      endDate: c.endDate,
      storageRate: c.storageRate,
      rateUnit: c.rateUnit.replace("_", " "),
      billingFrequency: c.billingFrequency,
      currency: c.currency,
      status: c.status,
    }));
  }

  async getPortalInvoices(customerId: string): Promise<CustomerPortalInvoice[]> {
    const invoices = MOCK_INVOICES.filter(
      (i) => i.customerId === customerId && i.status !== "DRAFT" && i.status !== "VOID"
    );

    // Filter to customer-safe DTO representation
    return invoices.map((i) => ({
      invoiceNumber: i.invoiceNumber,
      contractCode: i.contractCode,
      billingPeriodStart: i.billingPeriodStart,
      billingPeriodEnd: i.billingPeriodEnd,
      issueDate: i.issueDate,
      dueDate: i.dueDate,
      totalAmount: i.totalAmount,
      amountPaid: i.amountPaid,
      balanceDue: i.balanceDue,
      currency: i.currency,
      status: i.status,
    }));
  }

  async getPortalDocuments(customerId: string): Promise<CustomerPortalDocument[]> {
    const docs = MOCK_DOCUMENTS.filter(
      (d) => d.customerId === customerId && d.status === "APPROVED"
    );

    // Filter to customer-safe DTO representation
    return docs.map((d) => ({
      documentCode: d.documentCode,
      title: d.title,
      documentType: d.documentType.replace("_", " "),
      issueDate: d.issueDate,
      expiryDate: d.expiryDate,
      status: d.status,
    }));
  }

  async syncCustomerStorageStatus(customerId: string): Promise<PortalSyncResult> {
    const customer = MOCK_CUSTOMERS.find((c) => c.id === customerId);
    if (!customer) {
      return {
        success: false,
        entityId: customerId,
        entityType: "CUSTOMER",
        syncedAt: new Date().toISOString(),
        message: `Customer ${customerId} not found.`,
      };
    }

    return {
      success: true,
      entityId: customerId,
      entityType: "CUSTOMER",
      syncedAt: new Date().toISOString(),
      message: `Successfully synchronized storage status for ${customer.name} with MoveIt Customer Portal REST API.`,
    };
  }

  async syncInvoiceStatus(invoiceId: string): Promise<PortalSyncResult> {
    const invoice = MOCK_INVOICES.find((i) => i.id === invoiceId);
    if (!invoice) {
      return {
        success: false,
        entityId: invoiceId,
        entityType: "INVOICE",
        syncedAt: new Date().toISOString(),
        message: `Invoice ${invoiceId} not found.`,
      };
    }

    return {
      success: true,
      entityId: invoiceId,
      entityType: "INVOICE",
      syncedAt: new Date().toISOString(),
      message: `Successfully synchronized invoice ${invoice.invoiceNumber} status (${invoice.status}) with MoveIt Customer Portal REST API.`,
    };
  }

  async syncContractStatus(contractId: string): Promise<PortalSyncResult> {
    const contract = MOCK_CONTRACTS.find((c) => c.id === contractId);
    if (!contract) {
      return {
        success: false,
        entityId: contractId,
        entityType: "CONTRACT",
        syncedAt: new Date().toISOString(),
        message: `Contract ${contractId} not found.`,
      };
    }

    return {
      success: true,
      entityId: contractId,
      entityType: "CONTRACT",
      syncedAt: new Date().toISOString(),
      message: `Successfully synchronized contract ${contract.contractCode} status (${contract.status}) with MoveIt Customer Portal REST API.`,
    };
  }
}
