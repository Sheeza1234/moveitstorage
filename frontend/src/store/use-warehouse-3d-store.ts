import { create } from "zustand";

export type CameraCommandType = "reset" | "zoomIn" | "zoomOut" | "rotate" | "focus";

export interface CameraCommand {
  nonce: number;
  type: CameraCommandType;
  /** Node id to focus (type === "focus"). Omitted => whole building. */
  nodeId?: string;
}

/**
 * Ephemeral view state for the 3D warehouse explorer ONLY.
 * Holds ids and UI flags - never warehouse, capacity, allocation or inventory data.
 */
interface Warehouse3DState {
  hoveredId: string | null;
  selectedId: string | null;
  selectedFloorId: string; // "ALL" or floor id
  matchIds: Set<string> | null;
  cameraCommand: CameraCommand | null;

  setHovered: (id: string | null) => void;
  setSelected: (id: string | null) => void;
  setSelectedFloor: (id: string) => void;
  setMatchIds: (ids: Set<string> | null) => void;
  sendCamera: (type: CameraCommandType, nodeId?: string) => void;
  reset: () => void;
}

let nonce = 0;

export const useWarehouse3DStore = create<Warehouse3DState>((set) => ({
  hoveredId: null,
  selectedId: null,
  selectedFloorId: "ALL",
  matchIds: null,
  cameraCommand: null,

  setHovered: (id) => set((s) => (s.hoveredId === id ? s : { hoveredId: id })),
  setSelected: (id) => set({ selectedId: id }),
  setSelectedFloor: (id) => set({ selectedFloorId: id }),
  setMatchIds: (ids) => set({ matchIds: ids }),
  sendCamera: (type, nodeId) => set({ cameraCommand: { nonce: ++nonce, type, nodeId } }),
  reset: () =>
    set({ hoveredId: null, selectedId: null, selectedFloorId: "ALL", matchIds: null, cameraCommand: null }),
}));
