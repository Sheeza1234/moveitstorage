import { 
  PackingMaterial, 
  CreatePackingMaterialInput,
  ApprovedMaterialItem,
  JobMaterialAllocation,
  IssueMaterialInput,
  MaterialIssuance,
  ReturnMaterialInput,
  MaterialReturn,
  CreateMaterialChangeRequestInput,
  MaterialChangeRequest,
  MaterialUsageRecord
} from "@/types/packing-material";
import { UserRole } from "@/types/role";

export interface IPackingMaterialService {
  getMaterials(): Promise<PackingMaterial[]>;
  getMaterialById(id: string): Promise<PackingMaterial | null>;
  createMaterial(input: CreatePackingMaterialInput, performedBy?: string): Promise<PackingMaterial>;
  updateMaterial(id: string, updates: Partial<PackingMaterial>, userRole?: UserRole, performedBy?: string): Promise<PackingMaterial>;
  
  allocateMaterialsForJob(jobId: string, items: ApprovedMaterialItem[], userRole?: UserRole, performedBy?: string): Promise<JobMaterialAllocation>;
  approveJobMaterialList(jobId: string, userRole?: UserRole, performedBy?: string): Promise<JobMaterialAllocation>;
  getJobMaterialList(jobId: string, version?: number): Promise<JobMaterialAllocation | null>;
  
  issueMaterial(input: IssueMaterialInput, userRole?: UserRole, performedBy?: string): Promise<MaterialIssuance>;
  returnMaterial(input: ReturnMaterialInput, userRole?: UserRole, performedBy?: string): Promise<MaterialReturn>;
  
  requestMaterialChange(input: CreateMaterialChangeRequestInput, performedBy?: string): Promise<MaterialChangeRequest>;
  reviewMaterialChange(requestId: string, approve: boolean, userRole?: UserRole, performedBy?: string): Promise<MaterialChangeRequest>;
  getChangeRequests(jobId?: string): Promise<MaterialChangeRequest[]>;
  
  getMaterialUsage(jobId: string): Promise<MaterialUsageRecord[]>;
  getLowStockAlerts(): Promise<PackingMaterial[]>;
  getIssuancesForJob(jobId: string): Promise<MaterialIssuance[]>;
  getReturnsForJob(jobId: string): Promise<MaterialReturn[]>;
}
