import { StorageType, CapacityUnit, LocationStatus } from "./warehouse";

export type AllocationStatus = 
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'RECOMMENDED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'RELEASED'
  | 'CANCELLED';

export interface StorageAllocation {
  id: string;
  allocationCode: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationPath: string;
  storageType: StorageType;
  requiredCapacity: number;
  allocatedCapacity: number;
  capacityUnit: CapacityUnit;
  status: AllocationStatus;
  startDate: string;
  expectedEndDate: string;
  confirmedAt?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  aiRecommended: boolean;
  recommendationReason?: string;
  recommendationScore?: number;
  notes?: string;
}

export interface StorageRequirementInput {
  customerId: string;
  storageType: StorageType;
  requiredCapacity: number;
  capacityUnit: CapacityUnit;
  startDate: string;
  expectedEndDate: string;
  preferredWarehouseId?: string;
  preferredLocationType?: StorageType;
  specialRequirements?: string;
  notes?: string;
}

export interface AllocationCandidateLocation {
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  locationPath: string;
  storageType: StorageType;
  capacityUnit: CapacityUnit;
  totalCapacity: number;
  occupiedCapacity: number;
  reservedCapacity: number;
  availableCapacity: number;
  remainingAfterAllocation: number;
  utilizationPercentage: number;
  status: LocationStatus;
  compatibilityScore: number;
  recommendationReason: string;
}

export interface AIRecommendationResult {
  requirement: StorageRequirementInput;
  candidateLocations: AllocationCandidateLocation[];
  topRecommendation?: AllocationCandidateLocation;
  evaluatedAt: string;
}

export interface AllocationSummary {
  totalAllocations: number;
  activeAllocations: number;
  confirmedAllocations: number;
  pendingAllocations: number;
  releasedAllocations: number;
  totalReservedCapacitySqFt: number;
  totalOccupiedCapacitySqFt: number;
}
