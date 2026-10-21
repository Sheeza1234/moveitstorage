import { CapacityUnit } from "./warehouse";

export type InventoryRecordStatus = 
  | 'EXPECTED'
  | 'RECEIVED'
  | 'STORED'
  | 'IN_STORAGE'
  | 'MOVED'
  | 'IN_TRANSIT'
  | 'PARTIALLY_RELEASED'
  | 'RELEASED'
  | 'DAMAGED'
  | 'LOST'
  | 'DISPOSED';

export type PackageType = 'CRATE' | 'PALLET' | 'BOX' | 'CONTAINER' | 'LOOSE' | 'RACK_UNIT' | 'CUSTOM';

export type MovementType = 'IN' | 'OUT' | 'INTERNAL_MOVE' | 'MOVE';

export interface PackageItem {
  id: string;
  name: string;
  quantity: number;
  fragile?: boolean;
  heavy?: boolean;
  specialHandling?: string;
  notes?: string;
}

export interface PackingList {
  id: string;
  packingListCode: string; // e.g. PL-2026-00001
  customerId: string;
  customerName: string;
  allocationId: string;
  allocationCode: string;
  packageCount: number;
  itemCount: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryRecord {
  id: string;
  inventoryCode: string; // e.g. INV-2026-00001
  packageId: string; // e.g. PKG-2026-00001
  packingListId?: string;
  customerId: string;
  customerName: string;
  allocationId: string;
  allocationCode: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationPath: string;
  packageType: PackageType;
  itemCount: number;
  releasedItemCount?: number;
  capacityFootprintSqFt: number;
  capacityUnit: CapacityUnit;
  description: string;
  weightKg?: number;
  volumeCuFt?: number;
  status: InventoryRecordStatus;
  receivedAt?: string;
  storedAt?: string;
  releasedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  items?: PackageItem[];
}

export interface MovementRecord {
  id: string;
  movementCode: string; // e.g. MOV-2026-00001
  inventoryId: string;
  packageId: string;
  packageCode: string;
  customerId: string;
  customerName: string;
  allocationId: string;
  fromWarehouseId?: string;
  fromWarehouseName?: string;
  fromLocationId?: string;
  fromLocationPath?: string;
  toWarehouseId?: string;
  toWarehouseName?: string;
  toLocationId?: string;
  toLocationPath?: string;
  movementType: MovementType;
  quantity: number;
  reason: string;
  performedBy: string;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes?: string;
}

// Backward compatibility interfaces for existing Phase 1-4 code
export type ItemStatus = InventoryRecordStatus;

export interface PackageRecord extends Partial<InventoryRecord> {
  id: string;
  packageId: string;
  customerId: string;
  customerName: string;
  allocationId: string;
  description: string;
  quantity: number;
  packageType: PackageType;
  status: ItemStatus;
  currentLocationPath: string;
  slotId: string;
  createdAt: string;
}

export interface MovementLog extends Partial<MovementRecord> {
  id: string;
  packageId: string;
  packageCode: string;
  movementType: MovementType;
  previousLocationPath: string;
  newLocationPath: string;
  timestamp: string;
  operatorName: string;
  reason: string;
  customerId: string;
  customerName: string;
  allocationId: string;
}

export interface InventorySummary {
  totalRecords: number;
  totalPackages: number;
  itemsCurrentlyStored: number;
  itemsInToday: number;
  itemsOutToday: number;
  pendingMovements: number;
  totalOccupiedFootprintSqFt: number;
}

export interface MovementSummary {
  totalMovements: number;
  itemsInCount: number;
  itemsOutCount: number;
  internalMovesCount: number;
}
