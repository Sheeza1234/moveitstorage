import { Customer, CreateCustomerInput } from "@/types";

export interface CustomerSummary {
  totalCustomers: number;
  activeCustomers: number;
  corporateCustomers: number;
  individualCustomers: number;
  customersWithActiveStorage: number;
}

export interface CustomerStorageOverview {
  activeAllocationsCount: number;
  totalStoredPackagesCount: number;
  totalOccupiedSqFt: number;
  activeContractsCount: number;
  outstandingInvoicesAmount: number;
  currency: string;
}

export interface ICustomerService {
  getCustomers(): Promise<Customer[]>;
  getCustomerById(id: string): Promise<Customer | null>;
  createCustomer(input: CreateCustomerInput): Promise<Customer>;
  updateCustomer(id: string, input: Partial<CreateCustomerInput>): Promise<Customer>;
  getCustomerSummary(): Promise<CustomerSummary>;
  getCustomerStorageOverview(customerId: string): Promise<CustomerStorageOverview>;
}
