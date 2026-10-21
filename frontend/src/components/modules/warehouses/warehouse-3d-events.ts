import * as React from "react";
import { ThreeEvent } from "@react-three/fiber";
import { WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";

/** Distinguishes a click from the end of an orbit drag. */
const CLICK_DRAG_TOLERANCE = 4;

/**
 * Pointer handlers shared by every interactive node. Handlers stop propagation so the nearest
 * object always wins (a slot in front of a rack frame is hovered, not the rack).
 */
export function useNodeEvents(node: WarehouseVisualNode, options?: { focusOnClick?: boolean }) {
  const focusOnClick = options?.focusOnClick ?? false;
  const nodeId = node.id;
  const nodeType = node.type;

  return React.useMemo(
    () => ({
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        useWarehouse3DStore.getState().setHovered(nodeId);
        document.body.style.cursor = "pointer";
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const s = useWarehouse3DStore.getState();
        if (s.hoveredId === nodeId) s.setHovered(null);
        document.body.style.cursor = "";
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > CLICK_DRAG_TOLERANCE) return;
        e.stopPropagation();
        const s = useWarehouse3DStore.getState();
        if (nodeType === "floor") {
          const leaving = s.selectedFloorId === nodeId;
          s.setSelectedFloor(leaving ? "ALL" : nodeId);
          s.setSelected(leaving ? null : nodeId);
          s.sendCamera("focus", leaving ? undefined : nodeId);
          return;
        }
        s.setSelected(nodeId);
        if (focusOnClick) s.sendCamera("focus", nodeId);
      },
    }),
    [nodeId, nodeType, focusOnClick]
  );
}
