"use client";

import * as React from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { WarehouseVisualModel } from "@/lib/utils/warehouse-visual-adapter";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";
import { DARK_PALETTE, LIGHT_PALETTE } from "./warehouse-3d-assets";
import { Warehouse3DProvider } from "./warehouse-3d-context";
import { Warehouse3DBuilding } from "./warehouse-3d-building";
import { Warehouse3DSelection } from "./warehouse-3d-selection";
import { WarehouseSceneLabelProjector } from "./warehouse-3d-labels";

const FOV = 38;
const ISO_DIR = new THREE.Vector3(0.78, 0.62, 1).normalize();

interface Fit {
  target: THREE.Vector3;
  distance: number;
}

function fitBox(center: [number, number, number], size: [number, number, number], aspect: number, minDistance = 6, slack = 0.74): Fit {
  const r = 0.5 * Math.hypot(size[0], size[1], size[2]);
  // Narrow viewports need more distance to keep the width in frame.
  const aspectFactor = aspect < 1 ? 1 / Math.max(0.5, aspect) : 1;
  const distance = Math.max(minDistance, (r / Math.sin((FOV * Math.PI) / 360)) * slack * aspectFactor);
  return { target: new THREE.Vector3(...center), distance };
}

function CameraRig({ model }: { model: WarehouseVisualModel }) {
  const { camera, invalidate, size } = useThree();
  const controls = React.useRef<OrbitControlsImpl>(null);
  const goal = React.useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const command = useWarehouse3DStore((s) => s.cameraCommand);
  const aspect = size.width / Math.max(1, size.height);

  const home = React.useMemo(() => {
    const { width, depth } = model.footprint;
    const fit = fitBox([0, model.height * 0.38, 0], [width + 4, model.height + 1, depth + 4], aspect, 10);
    return { ...fit, pos: fit.target.clone().addScaledVector(ISO_DIR, fit.distance) };
  }, [model, aspect]);

  // Keep the home framing in sync with the model and viewport until the user moves the camera
  // (so the first paint, a resize and "Reset View" all agree).
  const userMoved = React.useRef(false);
  React.useLayoutEffect(() => {
    if (userMoved.current) return;
    camera.position.copy(home.pos);
    controls.current?.target.copy(home.target);
    controls.current?.update();
    goal.current = null;
    invalidate();
  }, [home, camera, invalidate]);
  React.useLayoutEffect(() => {
    userMoved.current = false;
  }, [model]);

  React.useEffect(() => {
    if (!command || !controls.current) return;
    const c = controls.current;
    const offset = camera.position.clone().sub(c.target);

    userMoved.current = command.type !== "reset";
    if (command.type === "reset") {
      goal.current = { pos: home.pos.clone(), target: home.target.clone() };
    } else if (command.type === "zoomIn" || command.type === "zoomOut") {
      const factor = command.type === "zoomIn" ? 0.75 : 1.33;
      const len = THREE.MathUtils.clamp(offset.length() * factor, c.minDistance, c.maxDistance);
      goal.current = { pos: c.target.clone().add(offset.setLength(len)), target: c.target.clone() };
    } else if (command.type === "rotate") {
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
      goal.current = { pos: c.target.clone().add(offset), target: c.target.clone() };
    } else if (command.type === "focus") {
      const node = command.nodeId ? model.index.get(command.nodeId) : undefined;
      if (!node || node.type === "warehouse") {
        goal.current = { pos: home.pos.clone(), target: home.target.clone() };
      } else {
        // Slots / shelves are framed together with their rack so the surrounding structure stays visible.
        const frame = node.type === "slot" || node.type === "shelf" ? (node.rackId ? model.index.get(node.rackId) : undefined) : undefined;
        const sz: [number, number, number] =
          node.type === "floor" ? [node.size[0], Math.min(node.size[1], 6), node.size[2]] : (frame ?? node).world.size;
        const wide = node.type === "floor" || node.type === "zone" || node.type === "row";
        const fit = fitBox(node.world.center, sz, aspect, node.type === "slot" ? 8 : 7, wide ? 0.78 : 1.02);
        // Keep the user's current viewing direction, but never look from below the horizon.
        const dir = offset.lengthSq() > 0 ? offset.normalize() : ISO_DIR.clone();
        if (dir.y < 0.3) dir.y = 0.3;
        dir.normalize();
        goal.current = { pos: fit.target.clone().addScaledVector(dir, fit.distance), target: fit.target };
      }
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command]);

  useFrame((state, delta) => {
    const g = goal.current;
    const c = controls.current;
    if (!g || !c) return;
    const k = 1 - Math.exp(-delta * 7);
    camera.position.lerp(g.pos, k);
    c.target.lerp(g.target, k);
    c.update();
    if (camera.position.distanceTo(g.pos) < 0.02 && c.target.distanceTo(g.target) < 0.02) {
      camera.position.copy(g.pos);
      c.target.copy(g.target);
      c.update();
      goal.current = null;
    }
    state.invalidate();
  });

  return (
    <OrbitControls
      ref={controls as React.Ref<OrbitControlsImpl>}
      makeDefault
      enableDamping={false}
      minDistance={3}
      maxDistance={home.distance * 2}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.06}
      screenSpacePanning
      onStart={() => {
        goal.current = null;
        userMoved.current = true;
      }}
    />
  );
}

export interface Warehouse3DSceneProps {
  model: WarehouseVisualModel;
  theme: "dark" | "light";
  inventoryLocationIds: ReadonlySet<string>;
  compact: boolean;
}

export function Warehouse3DScene({ model, theme, inventoryLocationIds, compact }: Warehouse3DSceneProps) {
  const palette = theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
  const { width, depth } = model.footprint;
  const span = Math.max(width, depth) + 6;
  const selectedFloorId = useWarehouse3DStore((s) => s.selectedFloorId);
  const detail = selectedFloorId !== "ALL" || !model.hasFloors;
  const context = React.useMemo(() => {
    const scope = model.hasFloors ? model.index.get(selectedFloorId) ?? model.root : model.root;
    const racks = detail ? scope.counts?.racks ?? 0 : 0;
    const rows = detail ? scope.counts?.rows ?? 0 : 0;
    return {
      palette,
      inventoryLocationIds,
      showDetailLabels: detail,
      showRackLabels: detail && racks > 0 && racks <= 12,
      showRowLabels: detail && rows > 0 && rows <= 30,
      index: model.index,
    };
  }, [palette, inventoryLocationIds, detail, model, selectedFloorId]);

  return (
    <Canvas
      frameloop="demand"
      shadows={compact ? false : { type: THREE.PCFShadowMap }}
      dpr={compact ? [1, 1.5] : [1, 2]}
      camera={{ fov: FOV, near: 0.1, far: 600 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onPointerMissed={() => useWarehouse3DStore.getState().setSelected(null)}
      aria-label="Interactive 3D warehouse. Use the location list below for a text alternative."
      role="img"
    >
      <Warehouse3DProvider value={context}>
        <ambientLight intensity={theme === "dark" ? 0.8 : 0.8} />
        <hemisphereLight args={["#ffffff", "#475569", theme === "dark" ? 0.7 : 0.6]} />
        <directionalLight
          position={[span * 0.6, span * 1.1, span * 0.8]}
          intensity={theme === "dark" ? 1.9 : 1.8}
          castShadow={!compact}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-span}
          shadow-camera-right={span}
          shadow-camera-top={span}
          shadow-camera-bottom={-span}
          shadow-camera-near={1}
          shadow-camera-far={span * 4}
          shadow-bias={-0.0004}
        />
        <Warehouse3DBuilding model={model} />
        <Warehouse3DSelection model={model} />
        <WarehouseSceneLabelProjector />
        <CameraRig model={model} />
      </Warehouse3DProvider>
    </Canvas>
  );
}
