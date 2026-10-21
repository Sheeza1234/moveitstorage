"use client";

import * as React from "react";
import { LocationStatus } from "@/types";
import { LOCATION_STATUS_3D, WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";
import { UNIT_BOX, flatMaterial, noRaycast, statusMaterial } from "./warehouse-3d-assets";
import { useNodeEvents } from "./warehouse-3d-events";
import { useWarehouse3DContext } from "./warehouse-3d-context";
import { useSceneLabel } from "./warehouse-3d-labels";

/**
 * Open-floor storage bay: a marked floor region (no rack geometry). The bay is split into
 * occupied / reserved / available blocks using the bay's own capacity figures.
 */
export const Warehouse3DOpenFloor = React.memo(function Warehouse3DOpenFloor({ node }: { node: WarehouseVisualNode }) {
  const { palette, inventoryLocationIds, showDetailLabels } = useWarehouse3DContext();
  const status: LocationStatus = node.status ?? "AVAILABLE";
  const dimmed = useWarehouse3DStore((s) => s.matchIds !== null && !s.matchIds.has(node.id));
  const events = useNodeEvents(node);

  const [w, h, d] = node.size;
  const total = node.capacity ?? 0;
  const blocks: { key: LocationStatus; value: number; height: number }[] = [
    { key: "OCCUPIED", value: node.occupied ?? 0, height: h * 0.75 },
    { key: "RESERVED", value: node.reserved ?? 0, height: h * 0.35 },
    { key: "AVAILABLE", value: node.available ?? 0, height: 0.04 },
  ];
  // Only drawn when the bay carries a capacity breakdown; otherwise a single status block.
  const hasBreakdown = total > 0 && blocks.some((b) => b.value > 0);

  useSceneLabel(
    showDetailLabels
      ? {
          id: `lbl-${node.id}`,
          position: [node.world.center[0], node.world.center[1] - h / 2 + h + 0.55, node.world.center[2]],
          text: node.label,
          tone: "bay",
          accent: LOCATION_STATUS_3D[status].hex,
          dimmed,
        }
      : null
  );

  let cursor = -w / 2 + 0.1;
  const usable = w - 0.2;

  return (
    <group position={node.position}>
      {/* Bay floor marking / pointer target */}
      <mesh
        geometry={UNIT_BOX}
        material={statusMaterial(status, dimmed ? "glassDim" : "glass")}
        position={[0, 0.09, 0]}
        scale={[w + 0.25, 0.06, d + 0.25]}
        receiveShadow
        {...events}
      />
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.slabEdge, dimmed ? 0.2 : 0.8)}
        position={[0, 0.075, 0]}
        scale={[w + 0.34, 0.03, d + 0.34]}
        raycast={noRaycast}
      />
      {hasBreakdown ? (
        blocks.map((b) => {
          if (b.value <= 0) return null;
          const bw = usable * (b.value / total);
          const x = cursor + bw / 2;
          cursor += bw;
          return (
            <mesh
              key={b.key}
              geometry={UNIT_BOX}
              material={statusMaterial(b.key, dimmed ? "cargoDim" : "cargo")}
              position={[x, 0.12 + b.height / 2, 0]}
              scale={[Math.max(0.05, bw - 0.06), b.height, d * 0.8]}
              castShadow={!dimmed}
              raycast={noRaycast}
            />
          );
        })
      ) : (
        <mesh
          geometry={UNIT_BOX}
          material={statusMaterial(status, dimmed ? "cargoDim" : "cargo")}
          position={[0, 0.12 + (status === "AVAILABLE" ? 0.02 : h * 0.4), 0]}
          scale={[w * 0.85, status === "AVAILABLE" ? 0.04 : h * 0.8, d * 0.8]}
          raycast={noRaycast}
        />
      )}
      {inventoryLocationIds.has(node.id) && !dimmed && (
        <mesh
          geometry={UNIT_BOX}
          material={flatMaterial("#f8fafc", 1, 0.4)}
          position={[w / 2 - 0.1, 0.35, d / 2 + 0.2]}
          scale={[0.28, 0.28, 0.08]}
          raycast={noRaycast}
        />
      )}
    </group>
  );
});
