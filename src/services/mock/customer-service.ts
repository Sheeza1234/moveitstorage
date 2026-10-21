import { ICustomerService, CustomerSummary, CustomerStorageOverview } from "../interfaces/ICustomerService";
import { Customer, CreateCustomerInput } from "@/types";
import { MOCK_CUSTOMERS, MOCK_ALLOCATIONS, MOCK_PACKAGES, MOCK_CONTRACTS, MOCK_INVOICES } from "./mock-db";
import { auditService } from "./audit-service";

export class MockCustomerService implements ICustomerService {
  private customers: Customer[] = [...MOCK_CUSTOMERS];

  async getCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const cust = this.customers.find((c) => c.id === id);
    return cust ? { ...cust } : null;
  }

  private generateCustomerCode(): string {
    const highestNumber = this.customers.reduce((max, c) => {
      const match = c.code.match(/CUS-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const nextNumber = highestNumber + 1;
    return `CUS-${String(nextNumber).padStart(5, "0")}`;
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    // Duplicate Email Check
    const emailExists = this.customers.some(
      (c) => c.email.toLowerCase().trim() === input.email.toLowerCase().trim()
    );
    if (emailExists) {
      throw new Error(`A customer with email address '${input.email}' already exists.`);
    }

    // Name formatting based on type
    let displayName = "";
    if (input.type === "CORPORATE") {
      displayName = input.companyName?.trim() || `${input.firstName} ${input.lastName}`.trim();
    } else {
      displayName = `${input.firstName || ""} ${input.lastName || ""}`.trim();
    }

    const code = this.generateCustomerCode();

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      code,
      type: input.type,
      name: displayName,
      companyName: input.companyName?.trim(),
      firstName: input.firstName?.trim(),
      lastName: input.lastName?.trim(),
      email: input.email.toLowerCase().trim(),
      phone: input.phone.trim(),
      alternatePhone: input.alternatePhone?.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      country: input.country.trim(),
      status: input.status,
      notes: input.notes?.trim(),
      requiredSqFt: input.requiredSqFt,
      storageStartDate: input.storageStartDate,
      storageDurationMonths: input.storageDurationMonths,
      activeAllocationsCount: 0,
      totalOccupiedSqFt: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.customers.unshift(newCustomer);
    MOCK_CUSTOMERS.unshift(newCustomer);
    await auditService.recordEvent({
      entityType: "CUSTOMER",
      entityId: newCustomer.id,
      action: "CUSTOMER_CREATED",
      description: `New customer profile '${newCustomer.name}' (${newCustomer.code}) created.`,
      performedBy: "Admin User",
      metadata: { name: newCustomer.name, code: newCustomer.code, status: newCustomer.status },
    });
    return { ...newCustomer };
  }

  async updateCustomer(id: string, input: Partial<CreateCustomerInput>): Promise<Customer> {
    const index = this.customers.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error("Customer record not found.");
    }

    const current = this.customers[index];

    // Unique email check if email is modified
    if (input.email && input.email.toLowerCase().trim() !== current.email.toLowerCase()) {
      const emailExists = this.customers.some(
        (c) => c.id !== id && c.email.toLowerCase().trim() === input.email!.toLowerCase().trim()
      );
      if (emailExists) {
        throw new Error(`A customer with email address '${input.email}' already exists.`);
      }
    }

    const type = input.type || current.type;
    let displayName = current.name;

    if (type === "CORPORATE") {
      displayName = input.companyName?.trim() || current.companyName || current.name;
    } else {
      const fn = input.firstName !== undefined ? input.firstName : current.firstName;
      const ln = input.lastName !== undefined ? input.lastName : current.lastName;
      displayName = `${fn || ""} ${ln || ""}`.trim();
    }

    const updated: Customer = {
      ...current,
      type,
      name: displayName,
      companyName: input.companyName !== undefined ? input.companyName?.trim() : current.companyName,
      firstName: input.firstName !== undefined ? input.firstName?.trim() : current.firstName,
      lastName: input.lastName !== undefined ? input.lastName?.trim() : current.lastName,
      email: input.email ? input.email.toLowerCase().trim() : current.email,
      phone: input.phone ? input.phone.trim() : current.phone,
      alternatePhone: input.alternatePhone !== undefined ? input.alternatePhone?.trim() : current.alternatePhone,
      address: input.address ? input.address.trim() : current.address,
      city: input.city ? input.city.trim() : current.city,
      country: input.country ? input.country.trim() : current.country,
      status: input.status || current.status,
      notes: input.notes !== undefined ? input.notes?.trim() : current.notes,
      requiredSqFt: input.requiredSqFt !== undefined ? input.requiredSqFt : current.requiredSqFt,
      storageStartDate: input.storageStartDate !== undefined ? input.storageStartDate : current.storageStartDate,
      storageDurationMonths: input.storageDurationMonths !== undefined ? input.storageDurationMonths : current.storageDurationMonths,
      updatedAt: new Date().toISOString(),
    };

    this.customers[index] = updated;
    const mockIdx = MOCK_CUSTOMERS.findIndex((c) => c.id === id);
    if (mockIdx !== -1) {
      MOCK_CUSTOMERS[mockIdx] = updated;
    }
    await auditService.recordEvent({
      entityType: "CUSTOMER",
      entityId: updated.id,
      action: "CUSTOMER_UPDATED",
      description: `Customer profile '${updated.name}' (${updated.code}) updated. Status: ${updated.status}.`,
      performedBy: "Admin User",
      metadata: {
        previousValue: current.status,
        newValue: updated.status,
        name: updated.name,
      },
    });
    return { ...updated };
  }

  async getCustomerSummary(): Promise<CustomerSummary> {
    const totalCustomers = this.customers.length;
    const activeCustomers = this.customers.filter((c) => c.status === "ACTIVE").length;
    const corporateCustomers = this.customers.filter((c) => c.type === "CORPORATE").length;
    const individualCustomers = this.customers.filter((c) => c.type === "INDIVIDUAL").length;
    const customersWithActiveStorage = this.customers.filter((c) => c.activeAllocationsCount > 0).length;

    return {
      totalCustomers,
      activeCustomers,
      corporateCustomers,
      individualCustomers,
      customersWithActiveStorage,
    };
  }

  async getCustomerStorageOverview(customerId: string): Promise<CustomerStorageOverview> {
    const customerAllocations = MOCK_ALLOCATIONS.filter((a) => a.customerId === customerId);
    const customerPackages = MOCK_PACKAGES.filter((p) => p.customerId === customerId);
    const customerContracts = MOCK_CONTRACTS.filter((c) => c.customerId === customerId);
    const customerInvoices = MOCK_INVOICES.filter(
      (i) => i.customerId === customerId && i.paymentStatus !== "PAID"
    );

    const totalSqFt = customerAllocations.reduce((sum, a) => sum + (a.allocatedCapacity || 0), 0);
    const outstandingAmount = customerInvoices.reduce((sum, i) => sum + i.totalAmount, 0);

    return {
      activeAllocationsCount: customerAllocations.length,
      totalStoredPackagesCount: customerPackages.length,
      totalOccupiedSqFt: totalSqFt,
      activeContractsCount: customerContracts.length,
      outstandingInvoicesAmount: outstandingAmount,
      currency: "AED",
    };
  }
}
