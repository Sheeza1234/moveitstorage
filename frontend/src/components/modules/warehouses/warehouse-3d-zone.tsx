"use client";

import * as React from "react";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { LAYOUT, LOCATION_STATUS_3D, WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { UNIT_BOX, flatMaterial, noRaycast } from "./warehouse-3d-assets";
import { useNodeEvents } from "./warehouse-3d-events";
import { useWarehouse3DContext } from "./warehouse-3d-context";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";
import { Warehouse3DOpenFloor } from "./warehouse-3d-open-floor";
import { useSceneLabel } from "./warehouse-3d-labels";

const pct = (n: WarehouseVisualNode) =>
  n.capacity !== undefined && n.capacity > 0
    ? calculateLocationCapacity(n.capacity, n.occupied ?? 0, n.reserved ?? 0).utilizationPercentage
    : undefined;

function RackLabel({ node }: { node: WarehouseVisualNode }) {
  const util = pct(node);
  useSceneLabel({
    id: `lbl-${node.id}`,
    position: [node.world.center[0], node.world.center[1] + node.size[1] / 2 + 0.3, node.world.center[2]],
    text: node.label,
    suffix: node.unlinked ? "no records" : util !== undefined ? `${util}%` : undefined,
    tone: "rack",
  });
  return null;
}

/** A row of racks: a floor lane (hover / click target) and an optional label. */
const Warehouse3DRow = React.memo(function Warehouse3DRow({ node }: { node: WarehouseVisualNode }) {
  const { palette, showRowLabels, showRackLabels, index } = useWarehouse3DContext();
  const events = useNodeEvents(node, { focusOnClick: true });
  const selected = useWarehouse3DStore((s) => s.selectedId === node.id);
  // Rack names are shown for the row you are working in (or for every rack when the scope is small).
  const active = useWarehouse3DStore((s) => {
    const ids = [s.selectedId, s.hoveredId];
    return ids.some((id) => {
      const n = id ? index.get(id) : undefined;
      return Boolean(n && (n.id === node.id || n.rowId === node.id));
    });
  });
  const [w, , d] = node.size;
  const util = pct(node);

  useSceneLabel(
    showRowLabels
      ? {
          id: `lbl-${node.id}`,
          position: [node.world.center[0] - w / 2 - 0.2, 0.3, node.world.center[2]],
          text: node.label,
          suffix: util !== undefined ? `${util}%` : undefined,
          tone: "bay",
          anchor: "right",
        }
      : null
  );

  return (
    <group position={node.position}>
      {/* Row lane: the marked strip the racks stand on */}
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(selected ? palette.lane : palette.slabEdge, selected ? 0.55 : 0.22, 0.9)}
        position={[0, 0.115, 0]}
        scale={[w + 0.5, 0.03, d + 0.45]}
        {...events}
      />
      {(showRackLabels || (showRowLabels && active)) && node.children?.map((rack) => <RackLabel key={rack.id} node={rack} />)}
    </group>
  );
});

/** A storage zone: floor pad, rows separated by aisles, and open-floor bays. */
export const Warehouse3DZone = React.memo(function Warehouse3DZone({ node }: { node: WarehouseVisualNode }) {
  const { palette } = useWarehouse3DContext();
  const events = useNodeEvents(node, { focusOnClick: true });
  const hovered = useWarehouse3DStore((s) => s.hoveredId === node.id);
  const selected = useWarehouse3DStore((s) => s.selectedId === node.id);
  const [w, , d] = node.size;

  const util = pct(node);
  const empty = !node.children || node.children.length === 0;
  const edge = node.status ? LOCATION_STATUS_3D[node.status].hex : palette.slabEdge;
  const c = node.counts;

  useSceneLabel({
    id: `lbl-${node.id}`,
    position: [node.world.center[0] - w / 2 + 0.2, node.world.center[1] - node.world.size[1] / 2 + 0.2, node.world.center[2] + d / 2 - 0.5],
    text: node.label,
    suffix: [
      util !== undefined ? `${util}%` : "",
      c && c.rows ? `${c.rows} row${c.rows === 1 ? "" : "s"} · ${c.racks} racks` : "",
      node.isOpenFloor ? "Open floor" : "",
      empty ? "No mapped locations" : "",
    ]
      .filter(Boolean)
      .join(" · "),
    tone: "zone",
    accent: edge,
    anchor: "left",
  });

  // aisle markings between consecutive blocks (rows / bay rows)
  const rows = (node.children ?? []).filter((n) => n.type === "row");
  const aisles = React.useMemo(() => {
    const zs = (node.children ?? []).map((n) => n.position[2]).sort((a, b) => a - b);
    const uniq = zs.filter((z, i) => i === 0 || Math.abs(z - zs[i - 1]) > 0.01);
    return uniq.slice(1).map((z, i) => (z + uniq[i]) / 2);
  }, [node.children]);

  return (
    <group position={node.position}>
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(hovered || selected ? palette.hover : palette.zoneFill, 1, 0.9)}
        position={[0, 0.05, 0]}
        scale={[w, 0.1, d]}
        receiveShadow
        {...events}
      />
      <mesh geometry={UNIT_BOX} material={flatMaterial(edge, 1, 0.6)} position={[0, 0.07, d / 2 - 0.04]} scale={[w, 0.06, 0.08]} raycast={noRaycast} />

      {/* Aisles: pale walkway band with a dashed centre line */}
      {aisles.map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh geometry={UNIT_BOX} material={flatMaterial("#fbbf24", 0.12)} position={[0, 0.108, 0]} scale={[w - 1, 0.01, LAYOUT.rowSpacing - 0.5]} raycast={noRaycast} />
          <mesh geometry={UNIT_BOX} material={flatMaterial("#fbbf24", 0.55)} position={[0, 0.118, 0]} scale={[w - 1.6, 0.01, 0.05]} raycast={noRaycast} />
        </group>
      ))}

      {rows.map((row) => (
        <Warehouse3DRow key={row.id} node={row} />
      ))}
      {node.children
        ?.filter((n) => n.type === "slot")
        .map((bay) => (
          <Warehouse3DOpenFloor key={bay.id} node={bay} />
        ))}
    </group>
  );
});
