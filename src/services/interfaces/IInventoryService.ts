import { 
  InventoryRecord, 
  InventoryRecordStatus,
  InventorySummary, 
  PackageType, 
  CapacityUnit 
} from "@/types";

export interface RecordItemsInInput {
  customerId: string;
  allocationId: string;
  warehouseId: string;
  locationId: string;
  packageType: PackageType;
  itemCount: number;
  capacityFootprintSqFt: number;
  capacityUnit: CapacityUnit;
  description: string;
  weightKg?: number;
  volumeCuFt?: number;
  notes?: string;
  items?: {
    name: string;
    quantity: number;
    fragile?: boolean;
    heavy?: boolean;
    specialHandling?: string;
    notes?: string;
  }[];
}

export interface RecordItemsOutInput {
  inventoryId: string;
  releaseQuantity: number;
  reason: string;
  performedBy?: string;
  notes?: string;
}

export interface MoveInventoryInput {
  inventoryId: string;
  toWarehouseId: string;
  toLocationId: string;
  reason: string;
  performedBy?: string;
  notes?: string;
}

export interface UpdateInventoryStatusInput {
  inventoryId: string;
  newStatus: InventoryRecordStatus;
  reason?: string;
  performedBy?: string;
  notes?: string;
}

export interface IInventoryService {
  getInventoryRecords(): Promise<InventoryRecord[]>;
  getInventoryById(id: string): Promise<InventoryRecord | null>;
  createInventoryRecord(input: RecordItemsInInput): Promise<InventoryRecord>;
  recordItemsIn(input: RecordItemsInInput): Promise<InventoryRecord>;
  recordItemsOut(input: RecordItemsOutInput): Promise<InventoryRecord>;
  moveInventory(input: MoveInventoryInput): Promise<InventoryRecord>;
  updateInventoryStatus(input: UpdateInventoryStatusInput): Promise<InventoryRecord>;
  getInventorySummary(): Promise<InventorySummary>;
  getCustomerInventory(customerId: string): Promise<InventoryRecord[]>;
  getAllocationInventory(allocationId: string): Promise<InventoryRecord[]>;
  getLocationInventory(locationId: string): Promise<InventoryRecord[]>;
}
