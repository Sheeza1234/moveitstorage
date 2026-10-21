import { LocationStatus } from "@/types";
import { LAYOUT, Vec3, WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";

/** One box in an InstancedMesh (world space). */
export interface Part {
  id: string;
  c: Vec3;
  s: Vec3;
}

export interface PositionPart extends Part {
  status?: LocationStatus;
  unlinked: boolean;
  /** Share of the cell that is filled (0 = empty). Derived from the position's own figures. */
  fill: number;
  /** y of the cell floor and cell size (cargo / pad / marker are placed from these) */
  baseY: number;
}

export interface RackBatchData {
  uprights: Part[];
  beams: Part[];
  decks: Part[];
  positions: PositionPart[];
  /** subsets of `positions` that get cargo / pad geometry */
  cargo: PositionPart[];
  pads: PositionPart[];
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function fillRatio(status: LocationStatus, n: WarehouseVisualNode): number {
  if (status === "AVAILABLE") return 0;
  if (status === "BLOCKED") return 0.9;
  const total = n.capacity ?? 0;
  if (total <= 0) return 0.6;
  if (status === "RESERVED") return Math.max(0.3, clamp01((n.reserved ?? 0) / total));
  if (status === "OCCUPIED") return Math.max(0.85, clamp01((n.occupied ?? 0) / total));
  return Math.max(0.25, clamp01((n.occupied ?? 0) / total));
}

/** Builds every box needed to draw a set of racks: frames (uprights, beams, decks) and positions. */
export function buildRackBatch(racks: WarehouseVisualNode[]): RackBatchData {
  const L = LAYOUT;
  const out: RackBatchData = { uprights: [], beams: [], decks: [], positions: [], cargo: [], pads: [] };

  for (const rack of racks) {
    const [cx, cy, cz] = rack.world.center;
    const [w, h, d] = rack.size;
    const baseY = cy - h / 2;
    const cols = rack.grid?.columns ?? 1;
    const levels = rack.grid?.levels ?? 1;

    for (let c = 0; c <= cols; c++) {
      const x = cx - w / 2 + L.rackPadX + c * L.positionWidth;
      for (const side of [-1, 1]) {
        out.uprights.push({ id: rack.id, c: [x, baseY + h / 2, cz + (side * (d - 0.08)) / 2], s: [0.07, h, 0.07] });
      }
    }
    for (let l = 0; l <= levels; l++) {
      const y = baseY + L.deck + l * L.levelHeight;
      for (const side of [-1, 1]) {
        out.beams.push({ id: rack.id, c: [cx, y, cz + (side * (d - 0.06)) / 2], s: [w - 0.04, 0.07, 0.06] });
      }
      if (l < levels) out.decks.push({ id: rack.id, c: [cx, y + 0.02, cz], s: [w - 0.14, 0.04, d - 0.14] });
    }

    for (const level of rack.children ?? []) {
      for (const slot of level.children ?? []) {
        const [sx, sy, sz] = slot.world.center;
        const [wx, wy, wz] = slot.size;
        const status = slot.unlinked ? undefined : slot.status ?? "AVAILABLE";
        const part: PositionPart = {
          id: slot.id,
          c: [sx, sy, sz],
          s: [wx, wy, wz],
          status,
          unlinked: Boolean(slot.unlinked),
          fill: status ? fillRatio(status, slot) : 0,
          baseY: sy - wy / 2,
        };
        out.positions.push(part);
        if (status) {
          out.pads.push(part);
          if (part.fill > 0) out.cargo.push(part);
        }
      }
    }
  }
  return out;
}

/** All rack nodes below a node (floor, zone or the warehouse root). */
export function collectRacks(node: WarehouseVisualNode, out: WarehouseVisualNode[] = []): WarehouseVisualNode[] {
  if (node.type === "rack") {
    out.push(node);
    return out;
  }
  node.children?.forEach((c) => collectRacks(c, out));
  return out;
}
