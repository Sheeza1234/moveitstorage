import { 
  MovementRecord, 
  MovementSummary, 
  MovementType 
} from "@/types";

export interface CreateMovementInput {
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
  notes?: string;
}

export interface IMovementService {
  getMovements(): Promise<MovementRecord[]>;
  getMovementById(id: string): Promise<MovementRecord | null>;
  getInventoryMovements(inventoryId: string): Promise<MovementRecord[]>;
  createMovement(input: CreateMovementInput): Promise<MovementRecord>;
  getMovementSummary(): Promise<MovementSummary>;
}
