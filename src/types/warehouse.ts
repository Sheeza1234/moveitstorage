export type StorageType = 'RACK' | 'SHELF' | 'FLOOR' | 'SLOT' | 'CUSTOM';
export type WarehouseStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type CapacityUnit = 'SQ_FT' | 'CU_FT';

export type LocationStatus = 
  | 'AVAILABLE'           // Green
  | 'PARTIALLY_OCCUPIED'  // Orange
  | 'OCCUPIED'            // Red
  | 'RESERVED'            // Blue
  | 'BLOCKED';            // Grey

export interface WarehouseSlot {
  id: string;
  code: string;
  name: string;
  shelfId?: string;
  rackId?: string;
  zoneId?: string;
  floorId?: string;
  warehouseId: string;
  storageType: StorageType;
  totalCapacitySqFt: number;
  occupiedCapacitySqFt: number;
  reservedCapacitySqFt: number;
  availableCapacitySqFt: number;
  status: LocationStatus;
  currentAllocationId?: string;
  notes?: string;
}

export interface Rack {
  id: string;
  code: string;
  name: string;
  zoneId: string;
  slots: WarehouseSlot[];
  totalCapacitySqFt?: number;
  occupiedSqFt?: number;
  reservedSqFt?: number;
  availableSqFt?: number;
  status?: LocationStatus;
  /** Visualisation only: which physical row of the zone this rack stands in ("A", "B", ...). */
  rowLabel?: string;
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  floorId?: string;
  warehouseId?: string;
  isOpenFloor?: boolean;
  /** Capacity the zone is declared to have (SQ.FT). Space not yet carved into racks / bays counts as available. */
  declaredCapacitySqFt?: number;
  racks?: Rack[];
  directSlots?: WarehouseSlot[];
  totalCapacitySqFt?: number;
  occupiedSqFt?: number;
  reservedSqFt?: number;
  availableSqFt?: number;
  status?: LocationStatus;
}

export interface Floor {
  id: string;
  code: string;
  name: string;
  warehouseId: string;
  zones: Zone[];
  totalCapacitySqFt?: number;
  occupiedSqFt?: number;
  reservedSqFt?: number;
  availableSqFt?: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  location: string;
  city: string;
  country: string;
  description?: string;
  capacityUnit: CapacityUnit;
  totalCapacitySqFt: number;
  occupiedSqFt: number;
  reservedSqFt: number;
  availableSqFt: number;
  utilizationPercentage: number;
  status: WarehouseStatus;
  activeAllocationsCount: number;
  floorsCount: number;
  floors?: Floor[];
  directZones?: Zone[]; // For warehouses that skip Floor level
  openFloorSlots?: WarehouseSlot[]; // For direct open floor warehouses
  isPrimary?: boolean;
  /** true once the structure is maintained from the portal: aggregates are then rolled up from positions */
  structureManaged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWarehouseInput {
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  description?: string;
  capacityUnit: CapacityUnit;
  totalCapacitySqFt: number;
  status: WarehouseStatus;
}

export interface UpdateWarehouseInput extends Partial<CreateWarehouseInput> {
  id: string;
}

/* ---- Portal-managed warehouse structure ---- */

export interface FloorInput {
  name: string;
  code: string;
}

export interface ZoneInput {
  /** omit for warehouses without a floor layer */
  floorId?: string;
  name: string;
  code: string;
  isOpenFloor?: boolean;
  /** total space of the zone in SQ.FT (optional) */
  capacitySqFt?: number;
}

export interface RackInput {
  name: string;
  code: string;
  /** physical row the rack stands in, e.g. "A" */
  rowLabel?: string;
  levels: number;
  positionsPerLevel: number;
  /** capacity of every generated storage position */
  positionCapacitySqFt: number;
}

export interface SlotInput {
  name: string;
  code: string;
  capacitySqFt: number;
  storageType?: StorageType;
}

export interface SlotUpdate {
  name?: string;
  code?: string;
  capacitySqFt?: number;
  /** true blocks the position (grey), false releases it */
  blocked?: boolean;
}
