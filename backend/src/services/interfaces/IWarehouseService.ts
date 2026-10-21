import { Warehouse, CreateWarehouseInput, FloorInput, ZoneInput, RackInput, SlotInput, SlotUpdate } from "@/types";
import type { WarehouseLayoutConfig } from "@/lib/utils/warehouse-visual-adapter";

export interface WarehouseCapacitySummary {
  totalWarehouses: number;
  activeWarehouses: number;
  totalCapacitySqFt: number;
  occupiedSqFt: number;
  reservedSqFt: number;
  availableSqFt: number;
  utilizationPercentage: number;
}

export interface IWarehouseService {
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse | null>;
  createWarehouse(input: CreateWarehouseInput): Promise<Warehouse>;
  updateWarehouse(id: string, input: Partial<CreateWarehouseInput>): Promise<Warehouse>;
  getWarehouseCapacitySummary(): Promise<WarehouseCapacitySummary>;

  /**
   * Warehouse structure maintained from the portal. Every method below is authorized on the server with
   * the WAREHOUSES permission (create* = CREATE, update* / saveLayoutConfig = EDIT, delete* = DELETE) and returns the
   * updated warehouse. Capacity of racks, zones and floors is rolled up from their positions.
   */
  createFloor(warehouseId: string, input: FloorInput): Promise<Warehouse>;
  updateFloor(floorId: string, input: Partial<FloorInput>): Promise<Warehouse>;
  deleteFloor(floorId: string): Promise<Warehouse>;
  createZone(warehouseId: string, input: ZoneInput): Promise<Warehouse>;
  updateZone(zoneId: string, input: Partial<Pick<ZoneInput, "name" | "code" | "capacitySqFt">>): Promise<Warehouse>;
  deleteZone(zoneId: string): Promise<Warehouse>;
  /** Creates a rack together with its levels x positions storage positions. */
  createRack(zoneId: string, input: RackInput): Promise<Warehouse>;
  updateRack(rackId: string, input: Partial<Pick<RackInput, "name" | "code" | "rowLabel">>): Promise<Warehouse>;
  deleteRack(rackId: string): Promise<Warehouse>;
  /** Adds one position to a rack, or one open-floor bay to an open-floor zone. */
  createSlot(parentId: string, input: SlotInput): Promise<Warehouse>;
  updateSlot(slotId: string, input: SlotUpdate): Promise<Warehouse>;
  deleteSlot(slotId: string): Promise<Warehouse>;

  /** Presentation-only layout skeleton (rows x racks x levels x positions) per warehouse. */
  getLayoutConfig(warehouseId: string): Promise<WarehouseLayoutConfig>;
  saveLayoutConfig(warehouseId: string, config: WarehouseLayoutConfig): Promise<WarehouseLayoutConfig>;
}
