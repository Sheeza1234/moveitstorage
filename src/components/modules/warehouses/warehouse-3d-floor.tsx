"use client";

import * as React from "react";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { UNIT_BOX, flatMaterial, noRaycast } from "./warehouse-3d-assets";
import { useNodeEvents } from "./warehouse-3d-events";
import { useWarehouse3DContext } from "./warehouse-3d-context";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";
import { Warehouse3DZone } from "./warehouse-3d-zone";
import { Warehouse3DRackBatch } from "./warehouse-3d-rack";
import { collectRacks } from "./warehouse-3d-batches";
import { useSceneLabel } from "./warehouse-3d-labels";

const POST = 0.14;

/** A single building level: slab, corner posts, glass walls and its zones. */
export const Warehouse3DFloor = React.memo(function Warehouse3DFloor({ node }: { node: WarehouseVisualNode }) {
  const { palette } = useWarehouse3DContext();
  const events = useNodeEvents(node);
  const visible = useWarehouse3DStore((s) => s.selectedFloorId === "ALL" || s.selectedFloorId === node.id);
  const overview = useWarehouse3DStore((s) => s.selectedFloorId === "ALL");
  const [w, h, d] = node.size;

  const util =
    node.capacity !== undefined
      ? calculateLocationCapacity(node.capacity, node.occupied ?? 0, node.reserved ?? 0).utilizationPercentage
      : undefined;

  const floorBase = node.world.center[1] - node.world.size[1] / 2;
  useSceneLabel(
    visible
      ? {
          id: `lbl-${node.id}`,
          position: [node.world.center[0] - w / 2 + 0.3, floorBase + 1.3, node.world.center[2] - d / 2 + 0.3],
          text: node.label,
          suffix: [util !== undefined ? `${util}%` : "", node.counts && node.counts.rows ? `${node.counts.rows} rows · ${node.counts.racks} racks · ${node.counts.positions} positions` : ""].filter(Boolean).join(" · "),
          tone: "floor",
          anchor: "left",
        }
      : null
  );
  const racks = React.useMemo(() => collectRacks(node), [node]);
  const noZones = !node.children || node.children.length === 0;
  useSceneLabel(
    visible && noZones
      ? { id: `lbl-${node.id}-empty`, position: [node.world.center[0], floorBase + 0.4, node.world.center[2]], text: "No storage layout configured for this floor.", tone: "note" }
      : null
  );

  return (
    <>
    {visible && racks.length > 0 && <Warehouse3DRackBatch racks={racks} />}
    <group position={node.position}>
      {/* Slab */}
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.slab, visible ? (overview ? 0.6 : 1) : 0.18, 0.95)}
        position={[0, -0.12, 0]}
        scale={[w, 0.24, d]}
        receiveShadow
        {...events}
      />
      {/* Slab outline */}
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.slabEdge, visible ? 0.9 : 0.15)}
        position={[0, -0.26, 0]}
        scale={[w + 0.1, 0.06, d + 0.1]}
        raycast={noRaycast}
      />
      {/* Corner posts + glass walls give the building its architectural shell */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}:${sz}`}
            geometry={UNIT_BOX}
            material={flatMaterial(palette.wall, visible ? 0.55 : 0.1)}
            position={[(sx * (w - POST)) / 2, h / 2, (sz * (d - POST)) / 2]}
            scale={[POST, h, POST]}
            raycast={noRaycast}
          />
        ))
      )}
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.wall, visible ? 0.09 : 0.02)}
        position={[0, h / 2, -d / 2 + 0.02]}
        scale={[w, h, 0.04]}
        raycast={noRaycast}
      />
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.wall, visible ? 0.07 : 0.02)}
        position={[-w / 2 + 0.02, h / 2, 0]}
        scale={[0.04, h, d]}
        raycast={noRaycast}
      />

      {visible && node.children?.map((zone) => <Warehouse3DZone key={zone.id} node={zone} />)}


    </group>
    </>
  );
});
