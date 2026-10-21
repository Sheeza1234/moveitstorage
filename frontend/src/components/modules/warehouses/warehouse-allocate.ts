import { services } from "@/services";
import { PackageType, StorageAllocation, UserRole } from "@/types";

/**
 * Client-side orchestration of the EXISTING allocation + inventory services:
 *   reserve space (allocation, confirmed on the position)  ->  receive goods (inventory) to occupy it.
 * Status follows from the numbers: occupied 0 -> Reserved, partly occupied -> Partially Occupied, all -> Occupied.
 */
export interface AllocateInput {
  warehouseId: string;
  slotId: string;
  customerId: string;
  role: UserRole;
  /** SQ.FT reserved for the customer */
  spaceSqFt: number;
  /** SQ.FT physically occupied now (0 = reserve only) */
  occupiedSqFt: number;
  goods: { packageType: PackageType; material: string; quantity: number; description?: string };
  storageType: "SLOT" | "FLOOR";
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function allocateToPosition(i: AllocateInput): Promise<StorageAllocation> {
  if (i.spaceSqFt <= 0) throw new Error("Enter the space to allocate in SQ.FT.");
  if (i.occupiedSqFt < 0 || i.occupiedSqFt > i.spaceSqFt) throw new Error("Occupied space must be between 0 and the allocated space.");
  if (i.occupiedSqFt > 0 && (!i.goods.material.trim() || i.goods.quantity <= 0)) {
    throw new Error("Enter the material and a quantity for the goods being stored.");
  }
  const start = new Date();
  const end = new Date(Date.now() + 180 * 864e5);
  const requirement = await services.allocationService.createAllocationRequirement(
    {
      customerId: i.customerId,
      storageType: i.storageType,
      requiredCapacity: i.spaceSqFt,
      capacityUnit: "SQ_FT",
      startDate: iso(start),
      expectedEndDate: iso(end),
      preferredWarehouseId: i.warehouseId,
      notes: i.goods.material ? `Material: ${i.goods.material}` : undefined,
    },
    i.role
  );
  let confirmed: StorageAllocation;
  try {
    confirmed = await services.allocationService.confirmAllocation(requirement.id, i.slotId, i.role);
  } catch (err) {
    await services.allocationService.cancelAllocation(requirement.id, i.role).catch(() => undefined);
    throw err;
  }
  if (i.occupiedSqFt > 0) {
    try {
      await services.inventoryService.recordItemsIn({
        customerId: i.customerId,
        allocationId: confirmed.id,
        warehouseId: i.warehouseId,
        locationId: i.slotId,
        packageType: i.goods.packageType,
        itemCount: Math.round(i.goods.quantity),
        capacityFootprintSqFt: i.occupiedSqFt,
        capacityUnit: "SQ_FT",
        description: i.goods.description?.trim() || i.goods.material.trim(),
        items: [{ name: i.goods.material.trim(), quantity: Math.round(i.goods.quantity) }],
      });
    } catch (err) {
      await services.allocationService.releaseAllocation(confirmed.id, i.role).catch(() => undefined);
      throw err;
    }
  }
  return confirmed;
}

/** Takes the stored goods out (if any) and releases the allocation, freeing the space again. */
export async function releaseAllocationSpace(allocation: StorageAllocation, role: UserRole): Promise<void> {
  const records = await services.inventoryService.getAllocationInventory(allocation.id);
  for (const r of records) {
    const remaining = r.itemCount - (r.releasedItemCount ?? 0);
    if (remaining > 0 && !["RELEASED", "DISPOSED", "LOST"].includes(r.status)) {
      await services.inventoryService.recordItemsOut({ inventoryId: r.id, releaseQuantity: remaining, reason: "Space released from the warehouse structure panel" });
    }
  }
  try {
    await services.allocationService.releaseAllocation(allocation.id, role);
  } catch (err) {
    const why = err instanceof Error ? err.message : "the allocation could not be closed";
    throw new Error(`${records.length ? "The stored goods were taken out, but " : ""}the allocation was not closed: ${why}`);
  }
}
