"use client";

import * as React from "react";
import * as THREE from "three";
import { WarehouseVisualModel } from "@/lib/utils/warehouse-visual-adapter";
import { UNIT_BOX } from "./warehouse-3d-assets";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";

const EDGES = new THREE.EdgesGeometry(UNIT_BOX);
const HOVER_MAT = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.9, depthTest: false });
const SELECT_MAT = new THREE.LineBasicMaterial({ color: "#e96d09", depthTest: false });
const BAY_MAT = new THREE.LineBasicMaterial({ color: "#f59e0b", transparent: true, opacity: 0.7, depthTest: false });

function Outline({ model, id, material }: { model: WarehouseVisualModel; id: string | null; material: THREE.LineBasicMaterial }) {
  if (!id) return null;
  const node = model.index.get(id);
  if (!node) return null;
  const [cx, cy, cz] = node.world.center;
  const [w, , d] = node.world.size;
  let h = node.world.size[1];
  let y = cy;
  // Zones/floors are outlined as flat footprints instead of their full tall bounding volume.
  if (node.type === "zone" || node.type === "floor" || node.type === "row") {
    h = 0.3;
    y = node.world.center[1] - node.world.size[1] / 2 + 0.15;
  }
  return (
    <lineSegments geometry={EDGES} material={material} position={[cx, y, cz]} scale={[w + 0.08, h + 0.08, d + 0.08]} renderOrder={999} raycast={() => null} />
  );
}

/** The whole bay (column of positions across all levels) that contains the selected position. */
function BayOutline({ model, id }: { model: WarehouseVisualModel; id: string | null }) {
  const node = id ? model.index.get(id) : undefined;
  const rack = node?.rackId ? model.index.get(node.rackId) : undefined;
  if (!node || node.type !== "slot" || node.bay === undefined || !rack) return null;
  return (
    <lineSegments
      geometry={EDGES}
      material={BAY_MAT}
      position={[node.world.center[0], rack.world.center[1], rack.world.center[2]]}
      scale={[node.size[0] + 0.12, rack.size[1] + 0.05, rack.size[2] + 0.05]}
      renderOrder={998}
      raycast={() => null}
    />
  );
}

/** One hover outline and one selection outline for the whole scene (no per-node geometry). */
export function Warehouse3DSelection({ model }: { model: WarehouseVisualModel }) {
  const hoveredId = useWarehouse3DStore((s) => s.hoveredId);
  const selectedId = useWarehouse3DStore((s) => s.selectedId);
  return (
    <>
      {hoveredId !== selectedId && <Outline model={model} id={hoveredId} material={HOVER_MAT} />}
      <BayOutline model={model} id={selectedId} />
      <Outline model={model} id={selectedId} material={SELECT_MAT} />
    </>
  );
}
