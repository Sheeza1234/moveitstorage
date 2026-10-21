"use client";

import * as React from "react";
import { WarehouseVisualModel } from "@/lib/utils/warehouse-visual-adapter";
import { UNIT_BOX, flatMaterial, noRaycast } from "./warehouse-3d-assets";
import { useWarehouse3DContext } from "./warehouse-3d-context";
import { Warehouse3DFloor } from "./warehouse-3d-floor";
import { Warehouse3DZone } from "./warehouse-3d-zone";
import { Warehouse3DRackBatch } from "./warehouse-3d-rack";
import { collectRacks } from "./warehouse-3d-batches";
import { useSceneLabel } from "./warehouse-3d-labels";

/**
 * The building: ground plate plus either stacked floors (Structure A) or zones sitting directly
 * on the ground (Structures B / C - no artificial floor layer is created).
 */
export function Warehouse3DBuilding({ model }: { model: WarehouseVisualModel }) {
  const { palette } = useWarehouse3DContext();
  const { width, depth } = model.footprint;
  const children = model.root.children ?? [];
  const flatRacks = React.useMemo(() => (model.hasFloors ? [] : collectRacks(model.root)), [model]);
  useSceneLabel(
    model.isEmpty
      ? { id: "empty-structure", position: [0, 1, 0], text: "No floors, zones or racks configured for this facility yet", tone: "note" }
      : null
  );

  return (
    <group>
      {/* Ground plate */}
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.slab, 1, 1)}
        position={[0, -0.7, 0]}
        scale={[width + 4, 0.8, depth + 4]}
        receiveShadow
        raycast={noRaycast}
      />
      <mesh
        geometry={UNIT_BOX}
        material={flatMaterial(palette.slabEdge, 0.7)}
        position={[0, -1.12, 0]}
        scale={[width + 4.2, 0.05, depth + 4.2]}
        raycast={noRaycast}
      />

      {model.hasFloors
        ? children.map((floor) => <Warehouse3DFloor key={floor.id} node={floor} />)
        : children.map((zone) => <Warehouse3DZone key={zone.id} node={zone} />)}
      {flatRacks.length > 0 && <Warehouse3DRackBatch racks={flatRacks} />}

      {model.isEmpty && (
        <>
          {/* Empty shell so the facility still reads as a building */}
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh
                key={`${sx}:${sz}`}
                geometry={UNIT_BOX}
                material={flatMaterial(palette.wall, 0.5)}
                position={[(sx * (width - 0.2)) / 2, 1.6, (sz * (depth - 0.2)) / 2]}
                scale={[0.2, 3.2, 0.2]}
                raycast={noRaycast}
              />
            ))
          )}
        </>
      )}
    </group>
  );
}
