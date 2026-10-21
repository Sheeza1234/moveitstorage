import { StorageAllocation, StorageRequirementInput, AllocationCandidateLocation, AllocationSummary } from "@/types";
import { UserRole } from "@/types/role";

export interface IAllocationService {
  getAllocations(): Promise<StorageAllocation[]>;
  getAllocationById(id: string): Promise<StorageAllocation | null>;
  createAllocationRequirement(input: StorageRequirementInput, userRole?: UserRole): Promise<StorageAllocation>;
  findAvailableLocations(requirement: StorageRequirementInput): Promise<AllocationCandidateLocation[]>;
  confirmAllocation(allocationId: string, locationId: string, userRole?: UserRole): Promise<StorageAllocation>;
  releaseAllocation(allocationId: string, userRole?: UserRole): Promise<StorageAllocation>;
  cancelAllocation(allocationId: string, userRole?: UserRole): Promise<StorageAllocation>;
  getAllocationSummary(): Promise<AllocationSummary>;
}
