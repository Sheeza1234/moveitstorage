import { Floor, LocationStatus, Warehouse, WarehouseSlot, Zone, Rack } from "@/types";
import { calculateLocationCapacity } from "@/lib/utils/capacity";

/**
 * Presentation-only adapter: Warehouse (existing service data) -> renderable node tree.
 *
 *   Warehouse -> Floor -> Zone -> Row -> Rack -> Level -> Position
 *
 * Rows, levels, bays and ghost positions are VISUALISATION metadata. They are not business records:
 *  - the data model only has Floor > Zone > Rack > (shelf) > Slot,
 *  - rows are formed by grouping racks (optionally following an admin "layout skeleton"),
 *  - a skeleton cell that has no storage record is drawn as an unlinked ghost with no status.
 * Capacity and status values are passed through unchanged. Only aggregates for Row (and for Rack /
 * Zone when the service does not provide them) are derived by summing child values.
 */

export type WarehouseVisualNodeType = "warehouse" | "floor" | "zone" | "row" | "rack" | "shelf" | "slot";

export type Vec3 = [number, number, number];

export interface VisualBox {
  center: Vec3;
  size: Vec3;
}

export interface VisualCounts {
  rows: number;
  racks: number;
  positions: number;
  bays: number;
}

export interface WarehouseVisualNode {
  id: string;
  type: WarehouseVisualNodeType;
  /** Short label for 3D labels / lists, e.g. "Rack A-03" */
  label: string;
  /** Full name from the data model */
  name: string;
  code?: string;
  /** Human readable hierarchy trail */
  path: string;
  status?: LocationStatus;
  capacity?: number;
  occupied?: number;
  reserved?: number;
  available?: number;
  /** true when capacity figures were summed from child positions instead of coming from the service */
  derived?: boolean;
  floorId?: string;
  zoneId?: string;
  rackId?: string;
  rowId?: string;
  isOpenFloor?: boolean;
  /** Position level only */
  storageType?: WarehouseSlot["storageType"];
  allocationId?: string;
  /** Level grouping that does not exist as an entity in the data (layout-only) */
  synthetic?: boolean;
  /** Visualisation / test record that is not part of the business data */
  isDemo?: boolean;
  /** Layout cell without a storage record behind it */
  unlinked?: boolean;
  /** Position coordinates inside its rack (1-based) */
  level?: number;
  bay?: number;
  /** Rack grid size */
  grid?: { levels: number; columns: number };
  counts?: VisualCounts;
  /** Lower-cased text used by search (includes ancestors) */
  searchText: string;
  children?: WarehouseVisualNode[];
  /** Local origin (base-centre) relative to the parent's origin */
  position: Vec3;
  /** Footprint + height in scene units */
  size: Vec3;
  /** World-space bounding box (for camera focus / outlines) */
  world: VisualBox;
}

export interface WarehouseVisualModel {
  root: WarehouseVisualNode;
  index: Map<string, WarehouseVisualNode>;
  floors: WarehouseVisualNode[];
  zones: WarehouseVisualNode[];
  rows: WarehouseVisualNode[];
  racks: WarehouseVisualNode[];
  /** Every position / open-floor bay, linked or not */
  slots: WarehouseVisualNode[];
  hasFloors: boolean;
  isEmpty: boolean;
  footprint: { width: number; depth: number };
  floorPitch: number;
  height: number;
}

/** Admin "layout skeleton": physical shape of a zone (key = zone id, or floor id for zone-less floors). */
export interface RowLayoutConfig {
  racks: number;
  levels: number;
  positionsPerLevel: number;
}
export type WarehouseLayoutConfig = Record<string, RowLayoutConfig[]>;

/* ------------------------------------------------------------------ */
/* Status palette (3D). Reserved = blue per the MoveIt spec.            */
/* ------------------------------------------------------------------ */

export const LOCATION_STATUS_3D: Record<LocationStatus, { label: string; hex: string; description: string }> = {
  AVAILABLE: { label: "Available", hex: "#22c55e", description: "Free storage location" },
  PARTIALLY_OCCUPIED: { label: "Partially Occupied", hex: "#f59e0b", description: "Partly used capacity" },
  OCCUPIED: { label: "Occupied", hex: "#ef4444", description: "Fully occupied" },
  RESERVED: { label: "Reserved", hex: "#3b82f6", description: "Allocated, not yet in use" },
  BLOCKED: { label: "Blocked", hex: "#6b7280", description: "Unavailable for use" },
};

export const LOCATION_STATUS_ORDER: LocationStatus[] = [
  "AVAILABLE",
  "PARTIALLY_OCCUPIED",
  "OCCUPIED",
  "RESERVED",
  "BLOCKED",
];

/* ------------------------------------------------------------------ */
/* Layout spacing (configurable). Topologically accurate, not CAD.      */
/* ------------------------------------------------------------------ */

export const LAYOUT = {
  positionWidth: 1.05, // baySpacing: width of one position / bay along the rack
  positionDepth: 1.1,
  levelHeight: 0.95, // levelSpacing
  deck: 0.1,
  rackPadX: 0.15,
  rackDepthPad: 0.3,
  rackTop: 0.25,
  rackSpacing: 0.3, // gap between racks of a row
  rowSpacing: 2.6, // aisle between rows
  zonePad: 1.2,
  zoneLabelRoom: 1.1,
  zoneGap: 1.8,
  floorPad: 1.2,
  floorGap: 4.2,
  defaultRacksPerRow: 8,
  bayWidth: 3.4,
  bayDepth: 2.6,
  bayHeight: 1.0,
  bayGap: 0.5,
  baysPerRow: 3,
  minFloorWidth: 10,
  minFloorDepth: 6,
  emptyZoneWidth: 6,
  emptyZoneDepth: 3.4,
} as const;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

export function shortName(name: string): string {
  return name.split(" — ")[0].split(" (")[0].trim();
}

export const rowLetter = (i: number) => {
  let n = i;
  let s = "";
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
};
const pad2 = (n: number) => String(n).padStart(2, "0");

function searchBlob(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function resolveCapacity(
  total: number | undefined,
  occupied: number | undefined,
  reserved: number | undefined,
  available: number | undefined,
  status?: LocationStatus
) {
  if (total === undefined) return { capacity: undefined, occupied, reserved, available, status };
  const resolvedStatus = status ?? calculateLocationCapacity(total, occupied ?? 0, reserved ?? 0).status;
  return { capacity: total, occupied, reserved, available, status: resolvedStatus };
}

const emptyBox = (): VisualBox => ({ center: [0, 0, 0], size: [0, 0, 0] });

/* ------------------------------------------------------------------ */
/* Positions / levels / racks                                           */
/* ------------------------------------------------------------------ */

interface Ctx {
  floorId?: string;
  zoneId: string;
  rowId?: string;
  ancestorsText: string;
}

function slotNode(
  slot: WarehouseSlot,
  path: string,
  ctx: Omit<Ctx, "zoneId"> & { zoneId?: string; rackId?: string },
  size: Vec3,
  position: Vec3,
  extra?: Partial<WarehouseVisualNode>
): WarehouseVisualNode {
  const cap = resolveCapacity(
    slot.totalCapacitySqFt,
    slot.occupiedCapacitySqFt,
    slot.reservedCapacitySqFt,
    slot.availableCapacitySqFt,
    slot.status
  );
  return {
    id: slot.id,
    type: "slot",
    label: shortName(slot.name),
    name: slot.name,
    code: slot.code,
    path: `${path} › ${slot.name}`,
    ...cap,
    floorId: ctx.floorId ?? slot.floorId,
    zoneId: ctx.zoneId ?? slot.zoneId,
    rackId: ctx.rackId ?? slot.rackId,
    rowId: ctx.rowId,
    storageType: slot.storageType,
    allocationId: slot.currentAllocationId,
    isDemo: slot.id.startsWith("demo-"),
    searchText: searchBlob(slot.name, slot.code, ctx.ancestorsText),
    position,
    size,
    world: emptyBox(),
    ...extra,
  };
}

interface RackSource {
  id: string;
  code?: string;
  name: string;
  slots: WarehouseSlot[];
  service?: Rack;
  ghost?: boolean;
}

function buildRack(
  src: RackSource,
  skeleton: { levels: number; positionsPerLevel: number } | undefined,
  zonePath: string,
  ctx: Ctx
): WarehouseVisualNode {
  const L = LAYOUT;
  const rackPath = `${zonePath} › ${src.name}`;
  const ancestorsText = searchBlob(ctx.ancestorsText, src.name, src.code);
  const real = src.slots;

  // ---- decide the grid (levels x columns) and which slot sits in which cell
  let levels = 1;
  let columns = 1;
  let cellAt: (l: number, c: number) => WarehouseSlot | undefined = () => undefined;
  let levelLabels: string[] = [];
  let syntheticLevels = true;
  let ghostCells = false;

  if (skeleton) {
    columns = Math.max(1, skeleton.positionsPerLevel);
    levels = Math.max(1, skeleton.levels, Math.ceil(real.length / columns));
    cellAt = (l, c) => real[l * columns + c];
    ghostCells = true;
  } else {
    const groups = new Map<string, WarehouseSlot[]>();
    for (const s of real) {
      const key = s.shelfId ?? "__none";
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    if (groups.size > 1) {
      const lists = [...groups.values()];
      levels = lists.length;
      columns = Math.max(1, ...lists.map((x) => x.length));
      cellAt = (l, c) => lists[l]?.[c];
      levelLabels = [...groups.keys()].map((k, i) => (k === "__none" ? `Level ${i + 1}` : `Shelf ${k}`));
      syntheticLevels = [...groups.keys()].every((k) => k === "__none");
    } else {
      const n = real.length;
      levels = n >= 6 ? 3 : n >= 2 ? 2 : 1;
      columns = Math.max(1, Math.ceil(n / levels));
      cellAt = (l, c) => real[l * columns + c];
    }
  }

  const width = columns * L.positionWidth + L.rackPadX * 2;
  const depth = L.positionDepth + L.rackDepthPad;
  const height = levels * L.levelHeight + L.deck + L.rackTop;
  const rackLabel = shortName(src.name);

  const levelNodes: WarehouseVisualNode[] = [];
  for (let l = 0; l < levels; l++) {
    const label = levelLabels[l] ?? `Level ${l + 1}`;
    const levelPath = syntheticLevels ? rackPath : `${rackPath} › ${label}`;
    const children: WarehouseVisualNode[] = [];
    for (let c = 0; c < columns; c++) {
      const slot = cellAt(l, c);
      const px = -width / 2 + L.rackPadX + (c + 0.5) * L.positionWidth;
      const size: Vec3 = [L.positionWidth - 0.1, L.levelHeight - 0.14, L.positionDepth - 0.1];
      const coords = { level: l + 1, bay: c + 1 };
      const base = { floorId: ctx.floorId, zoneId: ctx.zoneId, rackId: src.id, rowId: ctx.rowId, ancestorsText: searchBlob(ancestorsText, label) };
      if (slot) {
        children.push(slotNode(slot, levelPath, base, size, [px, 0, 0], coords));
      } else if (ghostCells) {
        const name = `${rackLabel}-L${l + 1}-P${pad2(c + 1)}`;
        children.push({
          id: `${src.id}::L${l + 1}-P${pad2(c + 1)}`,
          type: "slot",
          label: name,
          name,
          path: `${levelPath} › ${name}`,
          unlinked: true,
          floorId: ctx.floorId,
          zoneId: ctx.zoneId,
          rackId: src.id,
          rowId: ctx.rowId,
          searchText: searchBlob(name, ancestorsText),
          position: [px, 0, 0],
          size,
          world: emptyBox(),
          ...coords,
        });
      }
    }
    levelNodes.push({
      id: `${src.id}::L${l + 1}`,
      type: "shelf",
      label,
      name: label,
      path: levelPath,
      floorId: ctx.floorId,
      zoneId: ctx.zoneId,
      rackId: src.id,
      rowId: ctx.rowId,
      synthetic: syntheticLevels,
      level: l + 1,
      searchText: searchBlob(ancestorsText, label),
      children,
      position: [0, L.deck + l * L.levelHeight, 0],
      size: [width, L.levelHeight, depth],
      world: emptyBox(),
    });
  }

  const cap = resolveCapacity(
    src.service?.totalCapacitySqFt,
    src.service?.occupiedSqFt,
    src.service?.reservedSqFt,
    src.service?.availableSqFt,
    src.service?.status
  );

  return {
    id: src.id,
    type: "rack",
    label: rackLabel,
    name: src.name,
    code: src.code,
    path: rackPath,
    ...cap,
    floorId: ctx.floorId,
    zoneId: ctx.zoneId,
    rowId: ctx.rowId,
    isDemo: src.id.startsWith("demo-"),
    unlinked: src.ghost,
    grid: { levels, columns },
    searchText: ancestorsText,
    children: levelNodes,
    position: [0, 0, 0],
    size: [width, height, depth],
    world: emptyBox(),
  };
}

/* ------------------------------------------------------------------ */
/* Rows / zones                                                         */
/* ------------------------------------------------------------------ */

function buildRow(rowName: string, racks: WarehouseVisualNode[], zone: Zone, zonePath: string, ctx: Ctx): WarehouseVisualNode {
  const L = LAYOUT;
  const label = `Row ${rowName}`;
  const width = racks.reduce((s, r) => s + r.size[0], 0) + L.rackSpacing * Math.max(0, racks.length - 1);
  const depth = Math.max(0, ...racks.map((r) => r.size[2]));
  const height = Math.max(0.4, ...racks.map((r) => r.size[1]));
  let x = -width / 2;
  for (const r of racks) {
    r.position = [x + r.size[0] / 2, 0, 0];
    x += r.size[0] + L.rackSpacing;
  }
  return {
    id: ctx.rowId as string,
    type: "row",
    label,
    name: `${label} — ${zone.name}`,
    path: `${zonePath} › ${label}`,
    floorId: ctx.floorId,
    zoneId: zone.id,
    isDemo: zone.id.startsWith("demo-"),
    searchText: searchBlob(label, ctx.ancestorsText),
    children: racks,
    position: [0, 0, 0],
    size: [width, height, depth],
    world: emptyBox(),
  };
}

function buildZone(
  zone: Zone,
  parentPath: string,
  floorId: string | undefined,
  ancestorsText: string,
  skeletonRows: RowLayoutConfig[] | undefined
): WarehouseVisualNode {
  const L = LAYOUT;
  const zonePath = `${parentPath} › ${zone.name}`;
  const zoneText = searchBlob(ancestorsText, zone.name, zone.code);
  const realRacks = zone.racks ?? [];

  // ---- plan rows: skeleton first (real racks fill it in order), leftovers chunked
  type Plan = { skeleton?: RowLayoutConfig; rack?: Rack }[];
  const plan: Plan[] = [];
  let cursor = 0;
  (skeletonRows ?? []).forEach((row) => {
    const rowPlan: Plan = [];
    for (let i = 0; i < Math.max(0, row.racks); i++) rowPlan.push({ skeleton: row, rack: realRacks[cursor++] });
    if (rowPlan.length) plan.push(rowPlan);
  });
  // Racks entered in the portal carry the row they stand in; otherwise they are chunked into rows.
  const rowNames: string[] = plan.map((_, i) => rowLetter(i));
  const leftovers = realRacks.slice(cursor);
  if (!skeletonRows?.length && leftovers.some((r) => r.rowLabel)) {
    const groups = new Map<string, Rack[]>();
    for (const rack of leftovers) {
      const key = (rack.rowLabel ?? "").trim() || "—";
      groups.set(key, [...(groups.get(key) ?? []), rack]);
    }
    const keys = [...groups.keys()].sort((a, b) => (a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b, undefined, { numeric: true })));
    for (const key of keys) {
      plan.push((groups.get(key) as Rack[]).map((rack) => ({ rack })));
      rowNames.push(key);
    }
  } else {
    for (let i = 0; i < leftovers.length; i += L.defaultRacksPerRow) {
      plan.push(leftovers.slice(i, i + L.defaultRacksPerRow).map((rack) => ({ rack })));
      rowNames.push(rowLetter(plan.length - 1));
    }
  }

  const rowNodes: WarehouseVisualNode[] = plan.map((rowPlan, ri) => {
    const rowId = `${zone.id}::row::${ri}`;
    const rowCtx: Ctx = { floorId, zoneId: zone.id, rowId, ancestorsText: searchBlob(zoneText, `row ${rowNames[ri]}`) };
    const racks = rowPlan.map((cell, ci) =>
      buildRack(
        cell.rack
          ? { id: cell.rack.id, code: cell.rack.code, name: cell.rack.name, slots: cell.rack.slots ?? [], service: cell.rack }
          : {
              id: `${zone.id}::ghost::${ri}-${ci}`,
              code: undefined,
              name: `Rack ${rowNames[ri]}-${pad2(ci + 1)}`,
              slots: [],
              ghost: true,
            },
        cell.skeleton && { levels: cell.skeleton.levels, positionsPerLevel: cell.skeleton.positionsPerLevel },
        `${zonePath} › Row ${rowNames[ri]}`,
        rowCtx
      )
    );
    return buildRow(rowNames[ri], racks, zone, zonePath, rowCtx);
  });

  // ---- open-floor bays (direct slots), laid out in a grid of bays
  const bayCtx = { floorId, zoneId: zone.id, ancestorsText: zoneText };
  const bays = (zone.directSlots ?? []).map((s) =>
    slotNode(s, zonePath, bayCtx, [L.bayWidth - 0.3, L.bayHeight, L.bayDepth - 0.3], [0, 0, 0])
  );
  const bayRows: WarehouseVisualNode[][] = [];
  for (let i = 0; i < bays.length; i += L.baysPerRow) bayRows.push(bays.slice(i, i + L.baysPerRow));

  // ---- stack rows (racks) and bay rows along z with aisles between
  const blocks: { nodes: WarehouseVisualNode[]; gap: number; depth: number; row?: WarehouseVisualNode }[] = [
    ...rowNodes.map((r) => ({ nodes: [r], gap: 0, depth: r.size[2], row: r })),
    ...bayRows.map((b) => ({ nodes: b, gap: L.bayGap, depth: L.bayDepth })),
  ];
  const widthOf = (b: (typeof blocks)[number]) =>
    b.row ? b.row.size[0] : b.nodes.reduce((s, n) => s + n.size[0], 0) + b.gap * Math.max(0, b.nodes.length - 1);

  let contentW: number = L.emptyZoneWidth;
  let contentD: number = L.emptyZoneDepth;
  let contentH = 0.4;
  if (blocks.length) {
    contentW = Math.max(L.emptyZoneWidth, ...blocks.map(widthOf));
    contentD = blocks.reduce((s, b) => s + b.depth, 0) + L.rowSpacing * (blocks.length - 1);
  }
  const width = contentW + L.zonePad * 2;
  const depth = contentD + L.zonePad * 2 + L.zoneLabelRoom;

  const children: WarehouseVisualNode[] = [];
  let z = -depth / 2 + L.zonePad;
  for (const b of blocks) {
    const zc = z + b.depth / 2;
    if (b.row) {
      b.row.position = [0, 0, zc];
      children.push(b.row);
    } else {
      let x = -widthOf(b) / 2;
      for (const n of b.nodes) {
        n.position = [x + n.size[0] / 2, 0, zc];
        x += n.size[0] + b.gap;
        children.push(n);
      }
    }
    contentH = Math.max(contentH, ...b.nodes.map((n) => n.size[1]));
    z += b.depth + L.rowSpacing;
  }

  const cap = resolveCapacity(zone.totalCapacitySqFt, zone.occupiedSqFt, zone.reservedSqFt, zone.availableSqFt, zone.status);

  return {
    id: zone.id,
    type: "zone",
    label: shortName(zone.name),
    name: zone.name,
    code: zone.code,
    path: zonePath,
    ...cap,
    floorId,
    zoneId: zone.id,
    isOpenFloor: Boolean(zone.isOpenFloor) || (rowNodes.length === 0 && bays.length > 0),
    isDemo: zone.id.startsWith("demo-"),
    searchText: zoneText,
    children,
    position: [0, 0, 0],
    size: [width, contentH, depth],
    world: emptyBox(),
  };
}

/** Zones are stacked along z (each zone is as wide as its widest row). */
function layoutZonesOnLevel(zoneNodes: WarehouseVisualNode[]) {
  if (zoneNodes.length === 0) return { width: 0, depth: 0, height: 0 };
  const L = LAYOUT;
  const totalD = zoneNodes.reduce((s, n) => s + n.size[2], 0) + L.zoneGap * (zoneNodes.length - 1);
  let z = -totalD / 2;
  for (const n of zoneNodes) {
    n.position = [0, 0, z + n.size[2] / 2];
    z += n.size[2] + L.zoneGap;
  }
  return {
    width: Math.max(...zoneNodes.map((n) => n.size[0])),
    depth: totalD,
    height: Math.max(...zoneNodes.map((n) => n.size[1])),
  };
}

/* ------------------------------------------------------------------ */
/* World coordinates, counts, aggregates                                */
/* ------------------------------------------------------------------ */

function assignWorld(node: WarehouseVisualNode, parentOrigin: Vec3, index: Map<string, WarehouseVisualNode>) {
  const origin: Vec3 = [
    parentOrigin[0] + node.position[0],
    parentOrigin[1] + node.position[1],
    parentOrigin[2] + node.position[2],
  ];
  node.world = { center: [origin[0], origin[1] + node.size[1] / 2, origin[2]], size: node.size };
  index.set(node.id, node);
  node.children?.forEach((c) => assignWorld(c, origin, index));
}

function collect(node: WarehouseVisualNode, type: WarehouseVisualNodeType, out: WarehouseVisualNode[]) {
  if (node.type === type) out.push(node);
  node.children?.forEach((c) => collect(c, type, out));
  return out;
}

function sumPositions(node: WarehouseVisualNode) {
  const slots = collect(node, "slot", []).filter((s) => !s.unlinked && s.capacity !== undefined);
  if (slots.length === 0) return undefined;
  const sum = (k: "capacity" | "occupied" | "reserved" | "available") => slots.reduce((t, s) => t + (s[k] ?? 0), 0);
  return { capacity: sum("capacity"), occupied: sum("occupied"), reserved: sum("reserved"), available: sum("available") };
}

function annotate(node: WarehouseVisualNode): VisualCounts {
  const counts: VisualCounts = { rows: 0, racks: 0, positions: 0, bays: 0 };
  if (node.type === "row") counts.rows += 1;
  if (node.type === "rack") counts.racks += 1;
  if (node.type === "slot" && !node.unlinked) {
    if (node.bay === undefined) counts.bays += 1;
    else counts.positions += 1;
  }
  for (const c of node.children ?? []) {
    const k = annotate(c);
    counts.rows += k.rows;
    counts.racks += k.racks;
    counts.positions += k.positions;
    counts.bays += k.bays;
  }
  node.counts = counts;

  // Rows always aggregate from their positions; racks / zones only when the service gave no totals.
  if ((node.type === "row" || ((node.type === "rack" || node.type === "zone") && node.capacity === undefined)) && !node.unlinked) {
    const s = sumPositions(node);
    if (s) {
      node.capacity = s.capacity;
      node.occupied = s.occupied;
      node.reserved = s.reserved;
      node.available = s.available;
      node.derived = true;
      node.status = calculateLocationCapacity(s.capacity, s.occupied, s.reserved).status;
    }
  }
  return counts;
}

/* ------------------------------------------------------------------ */
/* Model                                                                */
/* ------------------------------------------------------------------ */

export function buildWarehouseVisualModel(warehouse: Warehouse, layout?: WarehouseLayoutConfig): WarehouseVisualModel {
  const L = LAYOUT;
  const rootText = searchBlob(warehouse.name, warehouse.code);
  const floorsData: Floor[] = warehouse.floors ?? [];
  const hasFloors = floorsData.length > 0;

  const floorLevels = floorsData.map((floor) => {
    const floorText = searchBlob(rootText, floor.name, floor.code);
    const zonesData: Zone[] = [...(floor.zones ?? [])];
    // A floor with an admin layout but no zones gets a presentation-only group.
    if (zonesData.length === 0 && layout?.[floor.id]?.length) {
      zonesData.push({ id: `${floor.id}::layout`, code: `${floor.code}-LAYOUT`, name: "Floor layout", floorId: floor.id, warehouseId: warehouse.id, racks: [] });
    }
    const zones = zonesData.map((z) =>
      buildZone(z, floor.name, floor.id, floorText, layout?.[z.id] ?? (z.id === `${floor.id}::layout` ? layout?.[floor.id] : undefined))
    );
    return { floor, zones, extent: layoutZonesOnLevel(zones), floorText };
  });

  const directZoneNodes = (warehouse.directZones ?? []).map((z) => buildZone(z, warehouse.name, undefined, rootText, layout?.[z.id]));
  if (warehouse.openFloorSlots?.length) {
    directZoneNodes.push(
      buildZone(
        {
          id: `${warehouse.id}::open-floor`,
          code: `${warehouse.code}-OPEN`,
          name: "Open Floor Storage",
          warehouseId: warehouse.id,
          isOpenFloor: true,
          directSlots: warehouse.openFloorSlots,
        },
        warehouse.name,
        undefined,
        rootText,
        undefined
      )
    );
  }
  const directLayout = layoutZonesOnLevel(directZoneNodes);

  const extents = hasFloors ? floorLevels.map((l) => l.extent) : [directLayout];
  const width = Math.max(L.minFloorWidth, ...extents.map((e) => e.width + L.floorPad * 2));
  const depth = Math.max(L.minFloorDepth, ...extents.map((e) => e.depth + L.floorPad * 2));
  const floorPitch = Math.max(3.2, ...extents.map((e) => e.height)) + L.floorGap;

  const children: WarehouseVisualNode[] = [];
  if (hasFloors) {
    floorLevels.forEach((lvl, i) => {
      const cap = resolveCapacity(
        lvl.floor.totalCapacitySqFt,
        lvl.floor.occupiedSqFt,
        lvl.floor.reservedSqFt,
        lvl.floor.availableSqFt
      );
      children.push({
        id: lvl.floor.id,
        type: "floor",
        label: shortName(lvl.floor.name),
        name: lvl.floor.name,
        code: lvl.floor.code,
        path: lvl.floor.name,
        ...cap,
        floorId: lvl.floor.id,
        searchText: lvl.floorText,
        children: lvl.zones,
        position: [0, i * floorPitch, 0],
        size: [width, floorPitch - 0.4, depth],
        world: emptyBox(),
      });
    });
  } else {
    children.push(...directZoneNodes);
  }

  const rootCap = resolveCapacity(warehouse.totalCapacitySqFt, warehouse.occupiedSqFt, warehouse.reservedSqFt, warehouse.availableSqFt);
  const levels = hasFloors ? floorLevels.length : 1;
  const root: WarehouseVisualNode = {
    id: warehouse.id,
    type: "warehouse",
    label: warehouse.code,
    name: warehouse.name,
    code: warehouse.code,
    path: warehouse.name,
    ...rootCap,
    searchText: rootText,
    children,
    position: [0, 0, 0],
    size: [width, levels * floorPitch, depth],
    world: emptyBox(),
  };

  const index = new Map<string, WarehouseVisualNode>();
  assignWorld(root, [0, 0, 0], index);
  annotate(root);

  return {
    root,
    index,
    floors: collect(root, "floor", []),
    zones: collect(root, "zone", []),
    rows: collect(root, "row", []),
    racks: collect(root, "rack", []),
    slots: collect(root, "slot", []),
    hasFloors,
    isEmpty: !hasFloors && directZoneNodes.length === 0,
    footprint: { width, depth },
    floorPitch,
    height: levels * floorPitch,
  };
}

/* ------------------------------------------------------------------ */
/* Search / filter (presentation only)                                  */
/* ------------------------------------------------------------------ */

export interface WarehouseVisualFilter {
  query: string;
  status: LocationStatus | "ALL";
  zoneId: string;
}

export function isFilterActive(f: WarehouseVisualFilter): boolean {
  return f.query.trim().length > 0 || f.status !== "ALL" || f.zoneId !== "ALL";
}

/** Position ids that satisfy the filter. Returns null when no filter is active. Unlinked cells never match a status filter. */
export function computeMatchIds(model: WarehouseVisualModel, f: WarehouseVisualFilter): Set<string> | null {
  if (!isFilterActive(f)) return null;
  const q = f.query.trim().toLowerCase();
  const out = new Set<string>();
  for (const s of model.slots) {
    if (f.zoneId !== "ALL" && s.zoneId !== f.zoneId) continue;
    if (f.status !== "ALL" && s.status !== f.status) continue;
    if (q && !s.searchText.includes(q)) continue;
    out.add(s.id);
  }
  return out;
}

const TYPE_RANK: Record<WarehouseVisualNodeType, number> = {
  warehouse: 0,
  floor: 1,
  zone: 2,
  row: 3,
  rack: 4,
  shelf: 5,
  slot: 6,
};

/** Nodes whose own name/code matches the query (used to pick a camera target). */
export function searchNodes(model: WarehouseVisualModel, query: string, limit = 8): WarehouseVisualNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: WarehouseVisualNode[] = [];
  for (const n of model.index.values()) {
    if (n.type === "warehouse" || n.type === "shelf") continue;
    const own = `${n.name} ${n.code ?? ""}`.toLowerCase();
    if (own.includes(q)) hits.push(n);
  }
  hits.sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type]);
  return hits.slice(0, limit);
}
