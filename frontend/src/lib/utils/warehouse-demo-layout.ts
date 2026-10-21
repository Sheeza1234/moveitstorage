import { Floor, LocationStatus, Rack, Warehouse, WarehouseSlot, Zone } from "@/types";
import { RowLayoutConfig, WarehouseLayoutConfig, rowLetter } from "@/lib/utils/warehouse-visual-adapter";

/**
 * DEVELOPMENT / TEST ONLY.
 *
 * The mock warehouses only contain a handful of racks and slots, which is not enough to judge a
 * realistic rows-and-racks visualisation. This overlay returns a COPY of a warehouse in which
 *  - every real record is kept (same ids, so allocation / inventory links still work),
 *  - extra test racks / positions / bays are added, all with ids starting with "demo-",
 *  - the aggregates of any zone or rack that received test data are removed so they are derived
 *    from their positions instead of mixing real and test figures.
 * Warehouse- and floor-level capacity (the numbers the capacity summary uses) is left untouched, and the
 * overlay is never persisted or sent to a service.
 */

export const DEMO_LAYOUT_NOTICE =
  "Demo layout: positions with ids starting “demo-” are visualisation test data, not business records. Warehouse and floor capacity still come from the capacity service.";

interface FloorSpec {
  /** rows per rack zone, one entry per rack zone on the floor */
  rowsPerZone: number[];
  racksPerRow: number;
  levels: number;
  positionsPerLevel: number;
}

// Mirrors the verification case: F1 3 zones / 4 rows x 8 racks x 4 levels x 4 positions,
// F2 2 zones / 3 rows x 6 racks x 4 x 4, F3 2 zones / 2 rows x 5 racks x 3 levels x 4.
// (Zone B on floor 1 is an open-floor zone in the data, so it contributes bays instead of rows.)
const FLOOR_SPECS: FloorSpec[] = [
  { rowsPerZone: [2, 2], racksPerRow: 8, levels: 4, positionsPerLevel: 4 },
  { rowsPerZone: [2, 1], racksPerRow: 6, levels: 4, positionsPerLevel: 4 },
  { rowsPerZone: [1, 1], racksPerRow: 5, levels: 3, positionsPerLevel: 4 },
];
const FLAT_SPEC: FloorSpec = { rowsPerZone: [3], racksPerRow: 8, levels: 4, positionsPerLevel: 4 };
const EMPTY_SPEC: FloorSpec = { rowsPerZone: [2], racksPerRow: 6, levels: 4, positionsPerLevel: 4 };
const OPEN_FLOOR_BAYS = 6;

const pad2 = (n: number) => String(n).padStart(2, "0");

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

function statusFor(id: string): LocationStatus {
  const r = hash(id);
  if (r < 38) return "AVAILABLE";
  if (r < 55) return "PARTIALLY_OCCUPIED";
  if (r < 85) return "OCCUPIED";
  if (r < 94) return "RESERVED";
  return "BLOCKED";
}

function figures(status: LocationStatus, total: number) {
  switch (status) {
    case "AVAILABLE":
      return { occ: 0, res: 0, avail: total };
    case "PARTIALLY_OCCUPIED":
      return { occ: Math.round(total * 0.4), res: Math.round(total * 0.2), avail: total - Math.round(total * 0.4) - Math.round(total * 0.2) };
    case "OCCUPIED":
      return { occ: total, res: 0, avail: 0 };
    case "RESERVED":
      return { occ: 0, res: total, avail: 0 };
    default:
      return { occ: 0, res: 0, avail: 0 };
  }
}

function demoSlot(
  id: string,
  code: string,
  name: string,
  ctx: { warehouseId: string; floorId?: string; zoneId: string; rackId?: string },
  total: number,
  storageType: WarehouseSlot["storageType"]
): WarehouseSlot {
  const status = statusFor(id);
  const f = figures(status, total);
  return {
    id,
    code,
    name,
    rackId: ctx.rackId,
    zoneId: ctx.zoneId,
    floorId: ctx.floorId,
    warehouseId: ctx.warehouseId,
    storageType,
    totalCapacitySqFt: total,
    occupiedCapacitySqFt: f.occ,
    reservedCapacitySqFt: f.res,
    availableCapacitySqFt: f.avail,
    status,
    notes: "Demo position (visualisation test data)",
  };
}

const SLOT_SQFT = 250;
const BAY_SQFT = 1000;

export function buildDemoLayout(warehouse: Warehouse): { warehouse: Warehouse; layout: WarehouseLayoutConfig } {
  const layout: WarehouseLayoutConfig = {};
  const whShort = warehouse.code.split("-")[0];

  function buildRackZone(
    zone: Zone,
    spec: FloorSpec,
    rows: number,
    floorId: string | undefined,
    floorTag: string,
    zoneTag: string
  ): Zone {
    const real = zone.racks ?? [];
    const total = rows * spec.racksPerRow;
    const perRack = spec.levels * spec.positionsPerLevel;
    const racks: Rack[] = [];
    for (let i = 0; i < total; i++) {
      const r = Math.floor(i / spec.racksPerRow);
      const c = i % spec.racksPerRow;
      const rackName = `Rack ${rowLetter(r)}-${pad2(c + 1)}`;
      const realRack = real[i];
      const rackId = realRack?.id ?? `demo-${zone.id}-r${r}-${c}`;
      const slots: WarehouseSlot[] = realRack ? [...(realRack.slots ?? [])] : [];
      for (let k = slots.length; k < perRack; k++) {
        const level = Math.floor(k / spec.positionsPerLevel) + 1;
        const pos = (k % spec.positionsPerLevel) + 1;
        const code = `${whShort}-${floorTag}-${zoneTag}-${rowLetter(r)}${pad2(c + 1)}-L${level}-P${pad2(pos)}`;
        slots.push(
          demoSlot(`demo-${zone.id}-r${r}-${c}-${k}`, code, `Position L${level}-P${pad2(pos)}`, { warehouseId: warehouse.id, floorId, zoneId: zone.id, rackId }, SLOT_SQFT, "SLOT")
        );
      }
      racks.push(
        realRack
          ? // keep the real rack but let its totals derive from all of its positions
            { ...realRack, slots, totalCapacitySqFt: undefined, occupiedSqFt: undefined, reservedSqFt: undefined, availableSqFt: undefined, status: undefined }
          : { id: rackId, code: `${whShort}-${floorTag}-${zoneTag}-${rowLetter(r)}${pad2(c + 1)}`, name: rackName, zoneId: zone.id, slots }
      );
    }
    const rowCfg: RowLayoutConfig = { racks: spec.racksPerRow, levels: spec.levels, positionsPerLevel: spec.positionsPerLevel };
    layout[zone.id] = Array.from({ length: rows }, () => ({ ...rowCfg }));
    return { ...zone, racks, totalCapacitySqFt: undefined, occupiedSqFt: undefined, reservedSqFt: undefined, availableSqFt: undefined, status: undefined };
  }

  function padOpenFloor(zone: Zone, floorId: string | undefined, floorTag: string, zoneTag: string): Zone {
    const slots = [...(zone.directSlots ?? [])];
    for (let k = slots.length; k < OPEN_FLOOR_BAYS; k++) {
      const id = `demo-${zone.id}-bay${k}`;
      slots.push(
        demoSlot(id, `${whShort}-${floorTag}-${zoneTag}-OPEN-${pad2(k + 1)}`, `Open Storage Bay ${pad2(k + 1)}`, { warehouseId: warehouse.id, floorId, zoneId: zone.id }, BAY_SQFT, "FLOOR")
      );
    }
    return { ...zone, directSlots: slots, totalCapacitySqFt: undefined, occupiedSqFt: undefined, reservedSqFt: undefined, availableSqFt: undefined, status: undefined };
  }

  /** Existing zones keep their identity; spec zones that do not exist yet are created as demo zones. */
  function buildLevel(zones: Zone[], spec: FloorSpec, floorId: string | undefined, floorIdx: number): Zone[] {
    const floorTag = floorId ? `F${floorIdx + 1}` : "G";
    const out: Zone[] = [];
    let specIdx = 0;
    zones.forEach((zone, zi) => {
      const zoneTag = `Z${String.fromCharCode(65 + zi)}`;
      const isOpen = Boolean(zone.isOpenFloor) || ((zone.directSlots?.length ?? 0) > 0 && (zone.racks?.length ?? 0) === 0);
      if (isOpen) {
        out.push(padOpenFloor(zone, floorId, floorTag, zoneTag));
      } else if (specIdx < spec.rowsPerZone.length) {
        out.push(buildRackZone(zone, spec, spec.rowsPerZone[specIdx++], floorId, floorTag, zoneTag));
      } else {
        out.push(zone);
      }
    });
    // An open-floor-only facility (e.g. an air-freight bay hub) keeps its identity: no racks are added to it.
    const openFloorOnly =
      !floorId && zones.length > 0 && zones.every((z) => Boolean(z.isOpenFloor) || ((z.directSlots?.length ?? 0) > 0 && (z.racks?.length ?? 0) === 0));
    while (!openFloorOnly && specIdx < spec.rowsPerZone.length) {
      const zi = out.length;
      const letter = String.fromCharCode(65 + zi);
      const prefix = floorIdx > 0 ? `Zone ${floorIdx + 1}` : "Zone ";
      const zone: Zone = {
        id: `demo-zn-${floorId ?? "g"}-${zi}`,
        code: `ZN-${floorIdx > 0 ? floorIdx + 1 : ""}${letter}`,
        name: `${prefix}${letter} — Demo zone`,
        floorId,
        warehouseId: warehouse.id,
        racks: [],
      };
      out.push(buildRackZone(zone, spec, spec.rowsPerZone[specIdx++], floorId, floorTag, `Z${letter}`));
    }
    return out;
  }

  let floors: Floor[] | undefined;
  let directZones: Zone[] | undefined;

  if (warehouse.floors?.length) {
    floors = warehouse.floors.map((f, i) => ({ ...f, zones: buildLevel(f.zones ?? [], FLOOR_SPECS[i % FLOOR_SPECS.length], f.id, i) }));
  } else if (warehouse.directZones?.length) {
    directZones = buildLevel(warehouse.directZones, FLAT_SPEC, undefined, 0);
  } else {
    directZones = buildLevel([], EMPTY_SPEC, undefined, 0);
  }

  return { warehouse: { ...warehouse, floors, directZones: directZones ?? warehouse.directZones }, layout };
}
