import { IContractService } from "../interfaces/IContractService";
import { 
  StorageContract, 
  CreateContractInput, 
  UpdateContractInput, 
  ContractStatus, 
  ContractSummary 
} from "@/types/contract";
import { MOCK_CONTRACTS, MOCK_CUSTOMERS, MOCK_ALLOCATIONS } from "./mock-db";
import { auditService } from "./audit-service";

const EXPIRY_THRESHOLD_DAYS = 30;

function calculateDaysDifference(targetDateStr: string): number {
  const target = new Date(targetDateStr);
  const now = new Date();
  // Normalize dates to midnight for clean day calculation
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function processContractExpiry(contract: StorageContract): StorageContract {
  const daysLeft = calculateDaysDifference(contract.endDate);
  let updatedStatus = contract.status;

  // Only evaluate auto-expiry for active/expiring states
  if (contract.status === 'ACTIVE' || contract.status === 'EXPIRING_SOON') {
    if (daysLeft < 0) {
      updatedStatus = 'EXPIRED';
    } else if (daysLeft <= EXPIRY_THRESHOLD_DAYS) {
      updatedStatus = 'EXPIRING_SOON';
    } else {
      updatedStatus = 'ACTIVE';
    }
  }

  return {
    ...contract,
    status: updatedStatus,
    daysUntilExpiry: daysLeft,
  };
}

export class MockContractService implements IContractService {
  private contracts: StorageContract[] = MOCK_CONTRACTS;

  async getContracts(): Promise<StorageContract[]> {
    this.contracts = this.contracts.map(processContractExpiry);
    return [...this.contracts];
  }

  async getContractById(id: string): Promise<StorageContract | null> {
    const contract = this.contracts.find((c) => c.id === id);
    if (!contract) return null;
    const processed = processContractExpiry(contract);
    return { ...processed };
  }

  async createContract(input: CreateContractInput): Promise<StorageContract> {
    // 1. Validate customer existence
    const customer = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error(`Customer with ID "${input.customerId}" not found.`);
    }

    // 2. Validate allocations if provided
    if (input.allocationIds && input.allocationIds.length > 0) {
      for (const allocId of input.allocationIds) {
        const alloc = MOCK_ALLOCATIONS.find((a) => a.id === allocId);
        if (!alloc) {
          throw new Error(`Allocation "${allocId}" does not exist.`);
        }
        if (alloc.customerId !== input.customerId) {
          throw new Error(`Selected allocation "${alloc.allocationCode || allocId}" does not belong to customer ${customer.name}.`);
        }
        if (alloc.status === 'CANCELLED' || alloc.status === 'RELEASED') {
          throw new Error(`Allocation "${alloc.allocationCode || allocId}" is ${alloc.status} and cannot be attached to a contract.`);
        }
      }
    }

    // 3. Validate dates
    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid start or end date.");
    }
    if (end.getTime() <= start.getTime()) {
      throw new Error("Contract End Date must be strictly after Start Date.");
    }

    // 4. Validate financial parameters
    if (input.storageRate <= 0) {
      throw new Error("Storage rate must be greater than 0.");
    }
    if (input.depositAmount !== undefined && input.depositAmount < 0) {
      throw new Error("Deposit amount cannot be negative.");
    }

    // Generate contract code
    const seq = (this.contracts.length + 1).toString().padStart(5, '0');
    const code = `CTR-2026-${seq}`;
    const nowIso = new Date().toISOString();

    const newContract: StorageContract = {
      id: `cnt-${Date.now()}`,
      contractCode: code,
      contractNumber: code,
      customerId: input.customerId,
      customerName: customer.name,
      allocationIds: input.allocationIds || [],
      contractType: input.contractType,
      startDate: input.startDate,
      endDate: input.endDate,
      storageRate: input.storageRate,
      monthlyRate: input.storageRate,
      rateUnit: input.rateUnit,
      billingFrequency: input.billingFrequency,
      currency: input.currency || 'AED',
      depositAmount: input.depositAmount || 0,
      status: 'DRAFT',
      notes: input.notes,
      documentIds: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const processed = processContractExpiry(newContract);
    this.contracts.unshift(processed);
    MOCK_CONTRACTS.unshift(processed);
    await auditService.recordEvent({
      entityType: "CONTRACT",
      entityId: processed.id,
      action: "CONTRACT_CREATED",
      description: `Storage contract ${processed.contractCode} created for ${processed.customerName}.`,
      performedBy: "Admin User",
      metadata: { contractCode: processed.contractCode, customerId: processed.customerId, rate: processed.storageRate },
    });
    return { ...processed };
  }

  async updateContract(id: string, input: UpdateContractInput): Promise<StorageContract> {
    const index = this.contracts.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Contract with ID "${id}" not found.`);
    }

    const existing = this.contracts[index];

    // Restrict editing core historical terms if contract is already ACTIVE / EXPIRED / TERMINATED
    if (existing.status !== 'DRAFT' && existing.status !== 'PENDING_SIGNATURE') {
      if (input.customerId && input.customerId !== existing.customerId) {
        throw new Error("Cannot change customer on an active or historic contract.");
      }
    }

    // If customer or allocations are changing, validate ownership
    const targetCustomerId = input.customerId || existing.customerId;
    const targetCustomer = MOCK_CUSTOMERS.find((c) => c.id === targetCustomerId);
    if (!targetCustomer) {
      throw new Error(`Customer "${targetCustomerId}" not found.`);
    }

    if (input.allocationIds) {
      for (const allocId of input.allocationIds) {
        const alloc = MOCK_ALLOCATIONS.find((a) => a.id === allocId);
        if (!alloc) {
          throw new Error(`Allocation "${allocId}" does not exist.`);
        }
        if (alloc.customerId !== targetCustomerId) {
          throw new Error(`Allocation "${alloc.allocationCode || allocId}" does not belong to customer ${targetCustomer.name}.`);
        }
      }
    }

    // Validate dates if modified
    const startDate = input.startDate || existing.startDate;
    const endDate = input.endDate || existing.endDate;
    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      throw new Error("Contract End Date must be after Start Date.");
    }

    if (input.storageRate !== undefined && input.storageRate <= 0) {
      throw new Error("Storage rate must be greater than 0.");
    }
    if (input.depositAmount !== undefined && input.depositAmount < 0) {
      throw new Error("Deposit amount cannot be negative.");
    }

    const updatedContract: StorageContract = {
      ...existing,
      ...input,
      customerName: targetCustomer.name,
      monthlyRate: input.storageRate !== undefined ? input.storageRate : existing.monthlyRate,
      updatedAt: new Date().toISOString(),
    };

    const processed = processContractExpiry(updatedContract);
    this.contracts[index] = processed;
    return { ...processed };
  }

  async updateContractStatus(id: string, status: ContractStatus): Promise<StorageContract> {
    const index = this.contracts.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Contract with ID "${id}" not found.`);
    }

    const current = this.contracts[index];

    // Controlled status transition logic
    if (current.status === status) {
      return { ...current };
    }

    // Disallow EXPIRED -> ACTIVE directly without renewal/date update
    if (current.status === 'EXPIRED' && status === 'ACTIVE') {
      throw new Error("Cannot directly set an expired contract to ACTIVE. Extend contract dates or issue a new contract.");
    }

    if (current.status === 'TERMINATED' || current.status === 'CANCELLED') {
      throw new Error(`Cannot change status of a ${current.status} contract.`);
    }

    const updated: StorageContract = {
      ...current,
      status,
      updatedAt: new Date().toISOString(),
    };

    const processed = processContractExpiry(updated);
    this.contracts[index] = processed;
    const mockIdx = MOCK_CONTRACTS.findIndex((c) => c.id === id);
    if (mockIdx !== -1) {
      MOCK_CONTRACTS[mockIdx] = processed;
    }
    return { ...processed };
  }

  async getCustomerContracts(customerId: string): Promise<StorageContract[]> {
    const all = await this.getContracts();
    return all.filter((c) => c.customerId === customerId);
  }

  async getAllocationContracts(allocationId: string): Promise<StorageContract[]> {
    const all = await this.getContracts();
    return all.filter((c) => c.allocationIds.includes(allocationId));
  }

  async getContractSummary(): Promise<ContractSummary> {
    const all = await this.getContracts();
    return {
      totalContracts: all.length,
      activeContracts: all.filter((c) => c.status === 'ACTIVE').length,
      pendingContracts: all.filter((c) => c.status === 'DRAFT' || c.status === 'PENDING_SIGNATURE').length,
      expiringSoonContracts: all.filter((c) => c.status === 'EXPIRING_SOON').length,
      expiredContracts: all.filter((c) => c.status === 'EXPIRED').length,
    };
  }
}
