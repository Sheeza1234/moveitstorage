import { 
  StorageContract, 
  CreateContractInput, 
  UpdateContractInput, 
  ContractStatus, 
  ContractSummary 
} from "@/types/contract";

export interface IContractService {
  getContracts(): Promise<StorageContract[]>;
  getContractById(id: string): Promise<StorageContract | null>;
  createContract(input: CreateContractInput): Promise<StorageContract>;
  updateContract(id: string, input: UpdateContractInput): Promise<StorageContract>;
  updateContractStatus(id: string, status: ContractStatus): Promise<StorageContract>;
  getCustomerContracts(customerId: string): Promise<StorageContract[]>;
  getAllocationContracts(allocationId: string): Promise<StorageContract[]>;
  getContractSummary(): Promise<ContractSummary>;
}
