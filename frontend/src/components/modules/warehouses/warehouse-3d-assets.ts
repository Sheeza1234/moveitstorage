import * as THREE from "three";
import { LocationStatus } from "@/types";
import { LOCATION_STATUS_3D } from "@/lib/utils/warehouse-visual-adapter";

/**
 * Shared geometries and materials. Every box in the scene is the same unit cube scaled per mesh,
 * and materials are cached per (status, variant) so hovering/selecting never allocates GPU resources.
 */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

export type SlotVariant = "glass" | "glassDim" | "cargo" | "cargoDim";

const cache = new Map<string, THREE.MeshStandardMaterial>();

export function statusMaterial(status: LocationStatus, variant: SlotVariant): THREE.MeshStandardMaterial {
  const key = `${status}:${variant}`;
  let mat = cache.get(key);
  if (!mat) {
    const color = new THREE.Color(LOCATION_STATUS_3D[status].hex);
    const dim = variant.endsWith("Dim");
    const glass = variant.startsWith("glass");
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness: glass ? 0.35 : 0.65,
      metalness: glass ? 0.1 : 0.05,
      transparent: glass || dim,
      opacity: glass ? (dim ? 0.05 : 0.2) : dim ? 0.1 : 1,
      depthWrite: !(glass || dim),
      emissive: color,
      emissiveIntensity: glass ? 0.05 : 0,
    });
    cache.set(key, mat);
  }
  return mat;
}

export interface ScenePalette {
  background: string;
  slab: string;
  slabEdge: string;
  zoneFill: string;
  rackUpright: string;
  rackBeam: string;
  wall: string;
  label: string;
  /** zone pad when hovered / selected */
  hover: string;
  /** selected row lane */
  lane: string;
}

export const DARK_PALETTE: ScenePalette = {
  background: "#101010",
  slab: "#2b2b2b",
  slabEdge: "#8c8c8c",
  zoneFill: "#383838",
  rackUpright: "#a3a3a3",
  rackBeam: "#e96d09",
  wall: "#d4d4d4",
  label: "#f5f5f5",
  hover: "#4a4a4a",
  lane: "#5c5c5c",
};

export const LIGHT_PALETTE: ScenePalette = {
  background: "#f7f7f6",
  slab: "#dcdcd8",
  slabEdge: "#9a9a96",
  zoneFill: "#ecece9",
  rackUpright: "#5f6368",
  rackBeam: "#e96d09",
  wall: "#8e8e8a",
  label: "#111111",
  hover: "#dededa",
  lane: "#bdbdb8",
};

const flat = new Map<string, THREE.MeshStandardMaterial>();
export function flatMaterial(color: string, opacity = 1, roughness = 0.8): THREE.MeshStandardMaterial {
  const key = `${color}:${opacity}:${roughness}`;
  let mat = flat.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0.05,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    flat.set(key, mat);
  }
  return mat;
}

/** Raycast stub: lets decorative meshes be ignored by pointer events. */
export const noRaycast = () => null;
