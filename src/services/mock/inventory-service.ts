import { 
  IInventoryService, 
  RecordItemsInInput, 
  RecordItemsOutInput, 
  MoveInventoryInput,
  UpdateInventoryStatusInput
} from "../interfaces/IInventoryService";
import { 
  InventoryRecord, 
  InventorySummary, 
  PackageItem
} from "@/types";
import { 
  MOCK_INVENTORY_RECORDS, 
  MOCK_CUSTOMERS, 
  MOCK_ALLOCATIONS, 
  MOCK_WAREHOUSES 
} from "./mock-db";
import { MockMovementService } from "./movement-service";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { findLocationInWarehouses } from "@/lib/utils/location-resolver";
import { auditService } from "./audit-service";

export class MockInventoryService implements IInventoryService {
  private records: InventoryRecord[] = MOCK_INVENTORY_RECORDS;
  private movementService = new MockMovementService();

  async getInventoryRecords(): Promise<InventoryRecord[]> {
    return [...this.records];
  }

  async getInventoryById(id: string): Promise<InventoryRecord | null> {
    const rec = this.records.find((r) => r.id === id || r.inventoryCode === id || r.packageId === id);
    return rec ? { ...rec } : null;
  }

  async getCustomerInventory(customerId: string): Promise<InventoryRecord[]> {
    return this.records.filter((r) => r.customerId === customerId);
  }

  async getAllocationInventory(allocationId: string): Promise<InventoryRecord[]> {
    return this.records.filter((r) => r.allocationId === allocationId);
  }

  async getLocationInventory(locationId: string): Promise<InventoryRecord[]> {
    return this.records.filter((r) => r.locationId === locationId);
  }

  private generateInventoryCode(): string {
    const highestNumber = this.records.reduce((max, r) => {
      const match = r.inventoryCode.match(/INV-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 3);

    const nextNumber = highestNumber + 1;
    return `INV-2026-${String(nextNumber).padStart(5, "0")}`;
  }

  private generatePackageCode(): string {
    const highestNumber = this.records.reduce((max, r) => {
      const match = r.packageId.match(/PKG-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 3);

    const nextNumber = highestNumber + 1;
    return `PKG-2026-${String(nextNumber).padStart(5, "0")}`;
  }

  async recordItemsIn(input: RecordItemsInInput): Promise<InventoryRecord> {
    return this.createInventoryRecord(input);
  }

  async createInventoryRecord(input: RecordItemsInInput): Promise<InventoryRecord> {
    // 1. Capacity Unit Check
    if (input.capacityUnit && input.capacityUnit !== "SQ_FT") {
      throw new Error(`Unsupported capacity unit '${input.capacityUnit}'. MoveIt Storage operates strictly in 'SQ_FT'.`);
    }
    if (!Number.isFinite(input.capacityFootprintSqFt) || input.capacityFootprintSqFt <= 0) {
      throw new Error("Inventory capacity footprint must be greater than zero.");
    }
    if (!Number.isInteger(input.itemCount) || input.itemCount <= 0) {
      throw new Error("Inventory item count must be a positive whole number.");
    }

    // 2. Customer Validation
    const customer = MOCK_CUSTOMERS.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error("Specified customer record does not exist.");
    }

    // 3. Allocation Validation
    const allocation = MOCK_ALLOCATIONS.find((a) => a.id === input.allocationId);
    if (!allocation) {
      throw new Error("Specified storage allocation does not exist.");
    }
    if (allocation.customerId !== customer.id) {
      throw new Error("Allocation does not belong to the selected customer.");
    }
    if (allocation.status !== "CONFIRMED" && allocation.status !== "ACTIVE") {
      throw new Error(`Cannot record items in against allocation in '${allocation.status}' status. Allocation must be CONFIRMED or ACTIVE.`);
    }

    if (input.capacityUnit && input.capacityUnit !== allocation.capacityUnit) {
      throw new Error(`Inventory capacity unit '${input.capacityUnit}' must match allocation unit '${allocation.capacityUnit}'.`);
    }

    if (!allocation.locationId || input.locationId !== allocation.locationId || input.warehouseId !== allocation.warehouseId) {
      throw new Error("Inventory must be received at the warehouse location reserved by its allocation.");
    }

    // 4. Centralized Location Resolution across all hierarchy structures
    const resLoc = findLocationInWarehouses(MOCK_WAREHOUSES, input.locationId, input.warehouseId);
    if (!resLoc) {
      throw new Error("Specified storage location does not exist or is invalid.");
    }

    const targetSlot = resLoc.slot;
    if (targetSlot.status === "BLOCKED") {
      throw new Error("Target location is currently BLOCKED and cannot accept physical inventory.");
    }

    // Capacity Check & Reserved -> Occupied Transition
    const capacityAlreadyUsed = this.records
      .filter((record) => record.allocationId === allocation.id)
      .reduce((sum, record) => {
        const releasedItems = record.releasedItemCount || 0;
        const releasedFootprint = record.itemCount > 0
          ? Math.round(record.capacityFootprintSqFt * releasedItems / record.itemCount)
          : 0;
        return sum + Math.max(0, record.capacityFootprintSqFt - releasedFootprint);
      }, 0);
    const availableAllocatedSpace = Math.max(0, allocation.allocatedCapacity - capacityAlreadyUsed);
    if (input.capacityFootprintSqFt > availableAllocatedSpace) {
      const shortfall = input.capacityFootprintSqFt - availableAllocatedSpace;
      throw new Error(
        `Storage Capacity Exceeded. Required incoming: ${input.capacityFootprintSqFt} ${input.capacityUnit || "SQ_FT"}, Available allocated capacity: ${availableAllocatedSpace} ${allocation.capacityUnit}, Shortfall: ${shortfall} SQ_FT.`
      );
    }

    // Transition Reserved -> Occupied
    const reservedDecrease = Math.min(targetSlot.reservedCapacitySqFt, input.capacityFootprintSqFt);
    targetSlot.reservedCapacitySqFt = Math.max(0, targetSlot.reservedCapacitySqFt - reservedDecrease);
    targetSlot.occupiedCapacitySqFt += input.capacityFootprintSqFt;

    const { status: updatedStatus } = calculateLocationCapacity(
      targetSlot.totalCapacitySqFt,
      targetSlot.occupiedCapacitySqFt,
      targetSlot.reservedCapacitySqFt,
      targetSlot.status
    );
    targetSlot.status = updatedStatus;

    // Authoritative single-state update for Allocation
    if (allocation.status === "CONFIRMED") {
      allocation.status = "ACTIVE";
    }

    // 5. Create Inventory Record
    const invCode = this.generateInventoryCode();
    const pkgCode = this.generatePackageCode();

    const formattedItems: PackageItem[] = input.items ? input.items.map((it, idx) => ({
      id: `item-${Date.now()}-${idx}`,
      name: it.name,
      quantity: it.quantity,
      fragile: it.fragile,
      heavy: it.heavy,
      specialHandling: it.specialHandling,
      notes: it.notes,
    })) : [];

    const newRecord: InventoryRecord = {
      id: `inv-${Date.now()}`,
      inventoryCode: invCode,
      packageId: pkgCode,
      packingListId: `PL-${Date.now().toString().slice(-5)}`,
      customerId: customer.id,
      customerName: customer.name,
      allocationId: allocation.id,
      allocationCode: allocation.allocationCode,
      warehouseId: resLoc.warehouse.id,
      warehouseName: resLoc.warehouse.name,
      locationId: input.locationId,
      locationPath: resLoc.locationPath,
      packageType: input.packageType,
      itemCount: input.itemCount,
      releasedItemCount: 0,
      capacityFootprintSqFt: input.capacityFootprintSqFt,
      capacityUnit: input.capacityUnit || "SQ_FT",
      description: input.description,
      weightKg: input.weightKg,
      volumeCuFt: input.volumeCuFt,
      status: "IN_STORAGE",
      receivedAt: new Date().toISOString(),
      storedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: input.notes,
      items: formattedItems,
    };

    this.records.unshift(newRecord);

    // 6. Create Movement Log Record
    await this.movementService.createMovement({
      inventoryId: newRecord.id,
      packageId: newRecord.packageId,
      packageCode: newRecord.packageId,
      customerId: customer.id,
      customerName: customer.name,
      allocationId: allocation.id,
      toWarehouseId: resLoc.warehouse.id,
      toWarehouseName: resLoc.warehouse.name,
      toLocationId: input.locationId,
      toLocationPath: resLoc.locationPath,
      movementType: "IN",
      quantity: input.itemCount,
      reason: `Physical inventory intake for ${customer.name} under ${allocation.allocationCode}`,
      performedBy: "Operations Staff",
      notes: input.notes,
    });

    // 7. Complete Audit Logging
    await auditService.recordEvent({
      entityType: "INVENTORY",
      entityId: newRecord.id,
      action: "INVENTORY_RECEIVED",
      description: `Physical inventory ${newRecord.inventoryCode} (${input.itemCount} items, ${input.capacityFootprintSqFt} SQ.FT) received at '${resLoc.locationPath}'.`,
      performedBy: "Operations Staff",
      metadata: {
        packageId: newRecord.packageId,
        allocationId: allocation.id,
        customerId: customer.id,
        capacityFootprintSqFt: input.capacityFootprintSqFt,
        locationPath: resLoc.locationPath,
      },
    });

    return { ...newRecord };
  }

  async recordItemsOut(input: RecordItemsOutInput): Promise<InventoryRecord> {
    const index = this.records.findIndex((r) => r.id === input.inventoryId || r.inventoryCode === input.inventoryId || r.packageId === input.inventoryId);
    if (index === -1) {
      throw new Error("Inventory record not found.");
    }

    const current = this.records[index];

    if (current.status === "RELEASED") {
      throw new Error("This inventory record has already been completely RELEASED.");
    }

    const currentRemaining = current.itemCount - (current.releasedItemCount || 0);
    if (input.releaseQuantity <= 0) {
      throw new Error("Release quantity must be greater than zero.");
    }
    if (input.releaseQuantity > currentRemaining) {
      throw new Error(
        `Over-Release Protection: Cannot release ${input.releaseQuantity} items. Only ${currentRemaining} items currently remain in storage.`
      );
    }

    const newReleasedTotal = (current.releasedItemCount || 0) + input.releaseQuantity;
    const isFullRelease = newReleasedTotal === current.itemCount;
    const newStatus = isFullRelease ? "RELEASED" : "PARTIALLY_RELEASED";

    // Proportionally decrease occupied space
    const previouslyReleasedItems = current.releasedItemCount || 0;
    const previouslyFreedSqFt = Math.round(current.capacityFootprintSqFt * previouslyReleasedItems / current.itemCount);
    const nowFreedSqFt = Math.round(current.capacityFootprintSqFt * newReleasedTotal / current.itemCount);
    const freedSqFt = nowFreedSqFt - previouslyFreedSqFt;

    // Update physical location occupied capacity using universal location resolver
    const resLoc = findLocationInWarehouses(MOCK_WAREHOUSES, current.locationId, current.warehouseId);
    if (resLoc) {
      const slot = resLoc.slot;
      slot.occupiedCapacitySqFt = Math.max(0, slot.occupiedCapacitySqFt - freedSqFt);
      const { status: updatedStatus } = calculateLocationCapacity(
        slot.totalCapacitySqFt,
        slot.occupiedCapacitySqFt,
        slot.reservedCapacitySqFt,
        slot.status
      );
      slot.status = updatedStatus;
    }

    const updatedRecord: InventoryRecord = {
      ...current,
      releasedItemCount: newReleasedTotal,
      status: newStatus,
      releasedAt: isFullRelease ? new Date().toISOString() : current.releasedAt,
      updatedAt: new Date().toISOString(),
    };

    this.records[index] = updatedRecord;

    // Create Movement Log
    await this.movementService.createMovement({
      inventoryId: current.id,
      packageId: current.packageId,
      packageCode: current.packageId,
      customerId: current.customerId,
      customerName: current.customerName,
      allocationId: current.allocationId,
      fromWarehouseId: current.warehouseId,
      fromWarehouseName: current.warehouseName,
      fromLocationId: current.locationId,
      fromLocationPath: current.locationPath,
      movementType: "OUT",
      quantity: input.releaseQuantity,
      reason: input.reason,
      performedBy: input.performedBy || "Operations Staff",
      notes: input.notes,
    });

    // Complete Audit Logging
    await auditService.recordEvent({
      entityType: "INVENTORY",
      entityId: current.id,
      action: isFullRelease ? "INVENTORY_RELEASED" : "INVENTORY_PARTIALLY_RELEASED",
      description: `Inventory ${current.inventoryCode}: ${input.releaseQuantity} items released (${freedSqFt} SQ.FT freed). Status: ${newStatus}.`,
      performedBy: input.performedBy || "Operations Staff",
      metadata: {
        previousValue: current.status,
        newValue: newStatus,
        releasedQuantity: input.releaseQuantity,
        freedSqFt,
      },
    });

    return { ...updatedRecord };
  }

  async moveInventory(input: MoveInventoryInput): Promise<InventoryRecord> {
    const index = this.records.findIndex((r) => r.id === input.inventoryId || r.inventoryCode === input.inventoryId || r.packageId === input.inventoryId);
    if (index === -1) {
      throw new Error("Inventory record not found.");
    }

    const current = this.records[index];

    if (current.status === "RELEASED") {
      throw new Error("Cannot move inventory that has already been RELEASED.");
    }

    const releasedItems = current.releasedItemCount || 0;
    const releasedFootprint = current.itemCount > 0
      ? Math.round(current.capacityFootprintSqFt * releasedItems / current.itemCount)
      : 0;
    const remainingFootprint = Math.max(0, current.capacityFootprintSqFt - releasedFootprint);

    // Destination Location Resolution using Universal Resolver
    const destLoc = findLocationInWarehouses(MOCK_WAREHOUSES, input.toLocationId, input.toWarehouseId);
    if (!destLoc) {
      throw new Error("Destination location does not exist or is invalid.");
    }

    const destSlot = destLoc.slot;
    if (destSlot.status === "BLOCKED") {
      throw new Error("Destination location is BLOCKED and cannot accept inventory.");
    }

    const { availableSqFt: destAvailable } = calculateLocationCapacity(
      destSlot.totalCapacitySqFt,
      destSlot.occupiedCapacitySqFt,
      destSlot.reservedCapacitySqFt,
      destSlot.status
    );

    if (remainingFootprint > destAvailable) {
      throw new Error(
        `Insufficient Destination Capacity. Required: ${remainingFootprint} SQ_FT, Destination Available: ${destAvailable} SQ_FT.`
      );
    }

    // Source Location Occupancy Reduction
    const sourceLoc = findLocationInWarehouses(MOCK_WAREHOUSES, current.locationId, current.warehouseId);
    if (sourceLoc) {
      const sourceSlot = sourceLoc.slot;
      sourceSlot.occupiedCapacitySqFt = Math.max(0, sourceSlot.occupiedCapacitySqFt - remainingFootprint);
      const { status: updatedStatus } = calculateLocationCapacity(
        sourceSlot.totalCapacitySqFt,
        sourceSlot.occupiedCapacitySqFt,
        sourceSlot.reservedCapacitySqFt,
        sourceSlot.status
      );
      sourceSlot.status = updatedStatus;
    }

    // Destination Location Occupancy Addition
    destSlot.occupiedCapacitySqFt += remainingFootprint;
    const { status: updatedDestStatus } = calculateLocationCapacity(
      destSlot.totalCapacitySqFt,
      destSlot.occupiedCapacitySqFt,
      destSlot.reservedCapacitySqFt,
      destSlot.status
    );
    destSlot.status = updatedDestStatus;

    const updatedRecord: InventoryRecord = {
      ...current,
      warehouseId: destLoc.warehouse.id,
      warehouseName: destLoc.warehouse.name,
      locationId: input.toLocationId,
      locationPath: destLoc.locationPath,
      updatedAt: new Date().toISOString(),
    };

    this.records[index] = updatedRecord;

    // Create Internal Move Log
    await this.movementService.createMovement({
      inventoryId: current.id,
      packageId: current.packageId,
      packageCode: current.packageId,
      customerId: current.customerId,
      customerName: current.customerName,
      allocationId: current.allocationId,
      fromWarehouseId: current.warehouseId,
      fromWarehouseName: current.warehouseName,
      fromLocationId: current.locationId,
      fromLocationPath: current.locationPath,
      toWarehouseId: destLoc.warehouse.id,
      toWarehouseName: destLoc.warehouse.name,
      toLocationId: input.toLocationId,
      toLocationPath: destLoc.locationPath,
      movementType: "INTERNAL_MOVE",
      quantity: current.itemCount - (current.releasedItemCount || 0),
      reason: input.reason,
      performedBy: input.performedBy || "Operations Staff",
      notes: input.notes,
    });

    // Complete Audit Logging
    await auditService.recordEvent({
      entityType: "INVENTORY",
      entityId: current.id,
      action: "INVENTORY_MOVED",
      description: `Inventory ${current.inventoryCode} moved from '${current.locationPath}' to '${destLoc.locationPath}'.`,
      performedBy: input.performedBy || "Operations Staff",
      metadata: {
        previousValue: current.locationPath,
        newValue: destLoc.locationPath,
        fromLocationId: current.locationId,
        toLocationId: input.toLocationId,
      },
    });

    return { ...updatedRecord };
  }

  async updateInventoryStatus(input: UpdateInventoryStatusInput): Promise<InventoryRecord> {
    const index = this.records.findIndex((r) => r.id === input.inventoryId || r.inventoryCode === input.inventoryId);
    if (index === -1) {
      throw new Error("Inventory record not found.");
    }

    const current = this.records[index];
    const updated: InventoryRecord = {
      ...current,
      status: input.newStatus,
      updatedAt: new Date().toISOString(),
    };

    this.records[index] = updated;
    await auditService.recordEvent({
      entityType: "INVENTORY",
      entityId: current.id,
      action: "INVENTORY_STATUS_CHANGED",
      description: `Inventory ${current.inventoryCode} status updated to ${input.newStatus}.`,
      performedBy: input.performedBy || "Operations Staff",
      metadata: {
        previousValue: current.status,
        newValue: input.newStatus,
        reason: input.reason,
      },
    });

    return { ...updated };
  }

  async getInventorySummary(): Promise<InventorySummary> {
    const totalRecords = this.records.length;
    const totalPackages = new Set(this.records.map((r) => r.packageId)).size;
    const itemsCurrentlyStored = this.records
      .filter((r) => r.status !== "RELEASED")
      .reduce((sum, r) => sum + (r.itemCount - (r.releasedItemCount || 0)), 0);

    const todayStr = new Date().toISOString().split("T")[0];
    const itemsInToday = this.records
      .filter((r) => r.createdAt.startsWith(todayStr))
      .reduce((sum, r) => sum + r.itemCount, 0);

    const itemsOutToday = this.records
      .filter((r) => r.releasedAt && r.releasedAt.startsWith(todayStr))
      .reduce((sum, r) => sum + (r.releasedItemCount || 0), 0);

    const pendingMovements = (await this.movementService.getMovements()).filter(
      (m) => m.status === "PENDING"
    ).length;

    const totalOccupiedFootprintSqFt = this.records
      .filter((r) => r.status === "IN_STORAGE" || r.status === "PARTIALLY_RELEASED")
      .reduce((sum, r) => {
        const remainingRatio = (r.itemCount - (r.releasedItemCount || 0)) / r.itemCount;
        return sum + Math.round(r.capacityFootprintSqFt * remainingRatio);
      }, 0);

    return {
      totalRecords,
      totalPackages,
      itemsCurrentlyStored,
      itemsInToday,
      itemsOutToday,
      pendingMovements,
      totalOccupiedFootprintSqFt,
    };
  }
}
