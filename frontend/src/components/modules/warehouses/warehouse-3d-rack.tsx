"use client";

import * as React from "react";
import * as THREE from "three";
import { ThreeEvent, useThree } from "@react-three/fiber";
import { LOCATION_STATUS_3D, WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";
import { UNIT_BOX, noRaycast } from "./warehouse-3d-assets";
import { Part, PositionPart, buildRackBatch } from "./warehouse-3d-batches";
import { useWarehouse3DContext } from "./warehouse-3d-context";

/* Shared materials. Instance colour (setColorAt) multiplies the white base colour. */
const glassMat = new THREE.MeshStandardMaterial({ color: "#ffffff", transparent: true, opacity: 0.2, roughness: 0.3, metalness: 0.1, depthWrite: false });
const solidMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.65, metalness: 0.05 });
const frameMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.45, metalness: 0.25 });

const GHOST = new THREE.Color("#9a9a9a");
const CLICK_DRAG_TOLERANCE = 4;
const colorCache = new Map<string, THREE.Color>();
const hex = (h: string) => {
  let c = colorCache.get(h);
  if (!c) colorCache.set(h, (c = new THREE.Color(h)));
  return c;
};

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

interface InstancedProps {
  parts: Part[];
  material: THREE.Material;
  colors?: THREE.Color[];
  events?: Record<string, (e: ThreeEvent<never>) => void>;
  renderOrder?: number;
}

/** One InstancedMesh = one draw call for any number of boxes. */
function InstancedBoxes({ parts, material, colors, events, renderOrder }: InstancedProps) {
  const ref = React.useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  React.useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      _p.set(p.c[0], p.c[1], p.c[2]);
      _s.set(p.s[0], p.s[1], p.s[2]);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [parts, invalidate]);

  React.useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh || !colors) return;
    for (let i = 0; i < parts.length; i++) mesh.setColorAt(i, colors[i] ?? GHOST);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    invalidate();
  }, [colors, parts, invalidate]);

  if (parts.length === 0) return null;
  return (
    <instancedMesh
      key={parts.length}
      ref={ref}
      args={[UNIT_BOX, material, parts.length]}
      frustumCulled={false}
      renderOrder={renderOrder}
      {...(events as object)}
    />
  );
}

const noPointer = { raycast: noRaycast };

/**
 * All racks of a floor (or of a single-level warehouse) drawn with instancing:
 * frames (uprights, beams, decks) + positions (glass cell, cargo, pad, inventory marker).
 * Rendering cost is a handful of draw calls regardless of rack / position count.
 */
export const Warehouse3DRackBatch = React.memo(function Warehouse3DRackBatch({ racks }: { racks: WarehouseVisualNode[] }) {
  const { palette, inventoryLocationIds } = useWarehouse3DContext();
  const matchIds = useWarehouse3DStore((s) => s.matchIds);

  const data = React.useMemo(() => buildRackBatch(racks), [racks]);

  // ---- colours (depend on filter / theme only; matrices are never rebuilt)
  const dimColor = React.useMemo(() => new THREE.Color(palette.slab).lerp(new THREE.Color(palette.background), 0.3), [palette]);
  const colorFor = React.useCallback(
    (p: PositionPart) => {
      const base = p.status ? hex(LOCATION_STATUS_3D[p.status].hex) : GHOST;
      if (!matchIds) return base;
      return matchIds.has(p.id) ? base : base.clone().lerp(dimColor, 0.82);
    },
    [matchIds, dimColor]
  );
  const glassColors = React.useMemo(() => data.positions.map(colorFor), [data.positions, colorFor]);
  const cargoColors = React.useMemo(() => data.cargo.map(colorFor), [data.cargo, colorFor]);
  const padColors = React.useMemo(() => data.pads.map(colorFor), [data.pads, colorFor]);
  const uprightColors = React.useMemo(() => data.uprights.map(() => hex(palette.rackUpright)), [data.uprights, palette]);
  const beamColors = React.useMemo(() => data.beams.map(() => hex(palette.rackBeam)), [data.beams, palette]);
  const deckColors = React.useMemo(() => data.decks.map(() => hex(palette.zoneFill)), [data.decks, palette]);

  // ---- instanced geometry derived from positions
  const cargoParts = React.useMemo<Part[]>(
    () => data.cargo.map((p) => {
      const h = Math.max(0.05, (p.s[1] - 0.08) * p.fill);
      return { id: p.id, c: [p.c[0], p.baseY + 0.05 + h / 2, p.c[2]], s: [p.s[0] * 0.8, h, p.s[2] * 0.78] };
    }),
    [data.cargo]
  );
  const padParts = React.useMemo<Part[]>(
    () => data.pads.map((p) => ({ id: p.id, c: [p.c[0], p.baseY + 0.045, p.c[2]], s: [p.s[0] * 0.92, 0.03, p.s[2] * 0.92] })),
    [data.pads]
  );
  const markerParts = React.useMemo<Part[]>(
    () =>
      data.pads
        .filter((p) => inventoryLocationIds.has(p.id))
        .map((p) => ({ id: p.id, c: [p.c[0] + p.s[0] / 2 - 0.1, p.baseY + p.s[1] - 0.08, p.c[2] + p.s[2] / 2 + 0.02], s: [0.15, 0.15, 0.05] })),
    [data.pads, inventoryLocationIds]
  );
  const markerColors = React.useMemo(() => markerParts.map(() => hex("#f8fafc")), [markerParts]);

  // ---- pointer events (nearest instance wins)
  const glassEvents = React.useMemo(
    () => ({
      onPointerMove: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const part = data.positions[e.instanceId ?? -1];
        if (part) useWarehouse3DStore.getState().setHovered(part.id);
        document.body.style.cursor = "pointer";
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        useWarehouse3DStore.getState().setHovered(null);
        document.body.style.cursor = "";
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > CLICK_DRAG_TOLERANCE) return;
        e.stopPropagation();
        const part = data.positions[e.instanceId ?? -1];
        if (part) useWarehouse3DStore.getState().setSelected(part.id);
      },
    }),
    [data.positions]
  );
  const frameEvents = React.useCallback(
    (parts: Part[]) => ({
      onPointerMove: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        const part = parts[e.instanceId ?? -1];
        if (part) useWarehouse3DStore.getState().setHovered(part.id);
        document.body.style.cursor = "pointer";
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        useWarehouse3DStore.getState().setHovered(null);
        document.body.style.cursor = "";
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (e.delta > CLICK_DRAG_TOLERANCE) return;
        e.stopPropagation();
        const part = parts[e.instanceId ?? -1];
        if (!part) return;
        const s = useWarehouse3DStore.getState();
        s.setSelected(part.id);
        s.sendCamera("focus", part.id);
      },
    }),
    []
  );
  const uprightEvents = React.useMemo(() => frameEvents(data.uprights), [frameEvents, data.uprights]);
  const beamEvents = React.useMemo(() => frameEvents(data.beams), [frameEvents, data.beams]);
  const deckEvents = React.useMemo(() => frameEvents(data.decks), [frameEvents, data.decks]);

  return (
    <group>
      <InstancedBoxes parts={data.uprights} material={frameMat} colors={uprightColors} events={uprightEvents as never} />
      <InstancedBoxes parts={data.beams} material={frameMat} colors={beamColors} events={beamEvents as never} />
      <InstancedBoxes parts={data.decks} material={solidMat} colors={deckColors} events={deckEvents as never} />
      <InstancedBoxes parts={padParts} material={solidMat} colors={padColors} events={noPointer as never} />
      <InstancedBoxes parts={cargoParts} material={solidMat} colors={cargoColors} events={noPointer as never} />
      <InstancedBoxes parts={markerParts} material={solidMat} colors={markerColors} events={noPointer as never} />
      <InstancedBoxes parts={data.positions} material={glassMat} colors={glassColors} events={glassEvents as never} renderOrder={2} />
    </group>
  );
});
