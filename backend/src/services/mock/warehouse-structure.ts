import { Floor, Rack, Warehouse, WarehouseSlot, Zone } from "@/types";
import { calculateLocationCapacity } from "@/lib/utils/capacity";

/** Pure helpers for the portal-managed warehouse structure (lookup + capacity roll-up). */

let counter = 0;
export function uid(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export interface Located<T> {
  warehouse: Warehouse;
  item: T;
  floor?: Floor;
  zone?: Zone;
  rack?: Rack;
}

export const allZones = (w: Warehouse): { zone: Zone; floor?: Floor }[] => [
  ...(w.floors ?? []).flatMap((f) => (f.zones ?? []).map((zone) => ({ zone, floor: f }))),
  ...(w.directZones ?? []).map((zone) => ({ zone })),
];

export const zoneSlots = (z: Zone): WarehouseSlot[] => [...(z.racks ?? []).flatMap((r) => r.slots ?? []), ...(z.directSlots ?? [])];
export const warehouseSlots = (w: Warehouse): WarehouseSlot[] => allZones(w).flatMap(({ zone }) => zoneSlots(zone));

export function locateFloor(warehouses: Warehouse[], id: string): Located<Floor> | undefined {
  for (const warehouse of warehouses) {
    const item = (warehouse.floors ?? []).find((f) => f.id === id);
    if (item) return { warehouse, item, floor: item };
  }
}

export function locateZone(warehouses: Warehouse[], id: string): Located<Zone> | undefined {
  for (const warehouse of warehouses) {
    for (const { zone, floor } of allZones(warehouse)) if (zone.id === id) return { warehouse, item: zone, zone, floor };
  }
}

export function locateRack(warehouses: Warehouse[], id: string): Located<Rack> | undefined {
  for (const warehouse of warehouses) {
    for (const { zone, floor } of allZones(warehouse)) {
      const item = (zone.racks ?? []).find((r) => r.id === id);
      if (item) return { warehouse, item, zone, floor, rack: item };
    }
  }
}

export function locateSlot(warehouses: Warehouse[], id: string): Located<WarehouseSlot> | undefined {
  for (const warehouse of warehouses) {
    for (const { zone, floor } of allZones(warehouse)) {
      for (const rack of zone.racks ?? []) {
        const item = (rack.slots ?? []).find((s) => s.id === id);
        if (item) return { warehouse, item, zone, floor, rack };
      }
      const item = (zone.directSlots ?? []).find((s) => s.id === id);
      if (item) return { warehouse, item, zone, floor };
    }
  }
}

type Totals = { total: number; occupied: number; reserved: number; available: number };
const zero = (): Totals => ({ total: 0, occupied: 0, reserved: 0, available: 0 });
const add = (a: Totals, b: Totals): Totals => ({
  total: a.total + b.total,
  occupied: a.occupied + b.occupied,
  reserved: a.reserved + b.reserved,
  available: a.available + b.available,
});

/** Blocked positions are not usable space, so they do not count towards capacity (keeps Total = Occupied + Reserved + Available). */
function slotTotals(allSlots: WarehouseSlot[]): Totals {
  const slots = allSlots.filter((s) => s.status !== "BLOCKED");
  return slots.reduce(
    (t, s) =>
      add(t, {
        total: s.totalCapacitySqFt,
        occupied: s.occupiedCapacitySqFt,
        reserved: s.reservedCapacitySqFt,
        available: s.availableCapacitySqFt,
      }),
    zero()
  );
}

function write(target: Rack | Zone | Floor, t: Totals) {
  target.totalCapacitySqFt = t.total;
  target.occupiedSqFt = t.occupied;
  target.reservedSqFt = t.reserved;
  target.availableSqFt = t.available;
}

/**
 * Rolls capacity up the hierarchy from the positions (uses the existing capacity helper for status).
 * Warehouse total stays the declared capacity, but never below the sum of its positions.
 */
export function rollup(w: Warehouse): void {
  // Allocation / inventory update a position's occupied + reserved figures and status but not its stored
  // `availableCapacitySqFt`. Re-derive it (the same formula the capacity helper uses) so every level agrees.
  for (const slot of warehouseSlots(w)) {
    slot.availableCapacitySqFt = slot.status === "BLOCKED" ? 0 : Math.max(0, slot.totalCapacitySqFt - slot.occupiedCapacitySqFt - slot.reservedCapacitySqFt);
  }
  let whSlots = zero();
  const zoneTotals = (zone: Zone): Totals => {
    let t = zero();
    for (const rack of zone.racks ?? []) {
      const rt = slotTotals(rack.slots ?? []);
      write(rack, rt);
      rack.status = calculateLocationCapacity(rt.total, rt.occupied, rt.reserved).status;
      t = add(t, rt);
    }
    t = add(t, slotTotals(zone.directSlots ?? []));
    // A zone with a declared capacity also owns the space that is not carved into racks / bays yet.
    if (zone.declaredCapacitySqFt !== undefined) {
      t.total = Math.max(zone.declaredCapacitySqFt, t.total);
      t.available = Math.max(0, t.total - t.occupied - t.reserved);
    }
    write(zone, t);
    zone.status = calculateLocationCapacity(t.total, t.occupied, t.reserved).status;
    return t;
  };

  for (const floor of w.floors ?? []) {
    let ft = zero();
    for (const zone of floor.zones ?? []) ft = add(ft, zoneTotals(zone));
    write(floor, ft);
    whSlots = add(whSlots, ft);
  }
  for (const zone of w.directZones ?? []) whSlots = add(whSlots, zoneTotals(zone));

  const total = Math.max(w.totalCapacitySqFt, whSlots.total);
  const c = calculateLocationCapacity(total, whSlots.occupied, whSlots.reserved);
  w.totalCapacitySqFt = c.totalSqFt;
  w.occupiedSqFt = c.occupiedSqFt;
  w.reservedSqFt = c.reservedSqFt;
  w.availableSqFt = c.availableSqFt;
  w.utilizationPercentage = c.utilizationPercentage;
  w.floorsCount = (w.floors ?? []).length;
  w.updatedAt = new Date().toISOString();
}
