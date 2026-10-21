"use client";

import * as React from "react";
import type { WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { ScenePalette, DARK_PALETTE } from "./warehouse-3d-assets";

export interface Warehouse3DContextValue {
  palette: ScenePalette;
  /** Location ids that currently hold inventory (from the existing inventory service). */
  inventoryLocationIds: ReadonlySet<string>;
  /** Rack / row / bay name labels (hidden in the all-floors overview to avoid clutter). */
  showRackLabels: boolean;
  showRowLabels: boolean;
  showDetailLabels: boolean;
  /** every node by id (lets a row know whether the selected / hovered item belongs to it) */
  index: ReadonlyMap<string, WarehouseVisualNode>;
}

const EMPTY: ReadonlySet<string> = new Set();

const Ctx = React.createContext<Warehouse3DContextValue>({
  palette: DARK_PALETTE,
  inventoryLocationIds: EMPTY,
  showRackLabels: true,
  showRowLabels: true,
  showDetailLabels: true,
  index: new Map(),
});

export const Warehouse3DProvider = Ctx.Provider;
export const useWarehouse3DContext = () => React.useContext(Ctx);
