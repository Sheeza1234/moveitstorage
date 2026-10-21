"use client";

import * as React from "react";
import { Crosshair, Layers3, RefreshCw, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { LocationStatus } from "@/types";
import {
  LOCATION_STATUS_3D,
  LOCATION_STATUS_ORDER,
  WarehouseVisualNode,
} from "@/lib/utils/warehouse-visual-adapter";
import { cn } from "@/lib/utils";
import { CameraCommandType } from "@/store/use-warehouse-3d-store";
import { NODE_TYPE_LABEL } from "./warehouse-location-tooltip";

const btn =
  "inline-flex items-center gap-1.5 rounded-lg border border-moveit-border bg-moveit-panel/90 px-2.5 py-1.5 text-[11px] font-semibold text-moveit-text backdrop-blur hover:bg-moveit-surface transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange";

export interface WarehouseCameraControlsProps {
  onCommand: (c: CameraCommandType) => void;
  onFocusFloor?: () => void;
  onFocusRack?: () => void;
  focusFloorEnabled: boolean;
  focusRackEnabled: boolean;
}

/** Camera controls: reset, zoom in/out, rotate, focus floor, focus selected rack. */
export function WarehouseCameraControls({ onCommand, onFocusFloor, onFocusRack, focusFloorEnabled, focusRackEnabled }: WarehouseCameraControlsProps) {
  const items: { type: CameraCommandType; label: string; icon: React.ReactNode }[] = [
    { type: "reset", label: "Reset View", icon: <RotateCcw className="h-3.5 w-3.5" /> },
    { type: "zoomIn", label: "Zoom In", icon: <ZoomIn className="h-3.5 w-3.5" /> },
    { type: "zoomOut", label: "Zoom Out", icon: <ZoomOut className="h-3.5 w-3.5" /> },
    { type: "rotate", label: "Rotate", icon: <RefreshCw className="h-3.5 w-3.5" /> },
  ];
  return (
    <div role="toolbar" aria-label="3D camera controls" className="flex flex-wrap items-center gap-1.5">
      {items.map((i) => (
        <button key={i.type} type="button" className={btn} onClick={() => onCommand(i.type)} aria-label={i.label} title={i.label}>
          {i.icon}
          <span className="hidden md:inline">{i.label}</span>
        </button>
      ))}
      {onFocusFloor && (
        <button type="button" className={cn(btn, "disabled:opacity-40 disabled:cursor-not-allowed")} onClick={onFocusFloor} disabled={!focusFloorEnabled} aria-label="Focus Floor" title="Focus the selected floor">
          <Crosshair className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Focus Floor</span>
        </button>
      )}
      {onFocusRack && (
        <button type="button" className={cn(btn, "disabled:opacity-40 disabled:cursor-not-allowed")} onClick={onFocusRack} disabled={!focusRackEnabled} aria-label="Focus Selected Rack" title="Focus the selected rack">
          <Crosshair className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Focus Selected Rack</span>
        </button>
      )}
    </div>
  );
}

export interface WarehouseFloorSelectorProps {
  floors: WarehouseVisualNode[];
  selectedFloorId: string;
  onSelect: (id: string) => void;
}

/** All Floors / Floor 3 / Floor 2 / Floor 1 (top floor listed first, like the building). */
export function WarehouseFloorSelector({ floors, selectedFloorId, onSelect }: WarehouseFloorSelectorProps) {
  const ordered = [...floors].reverse();
  return (
    <div role="group" aria-label="Floor selection" className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-moveit-muted">
        <Layers3 className="h-3.5 w-3.5 text-moveit-orange" />
        Floor
      </span>
      {[{ id: "ALL", label: "All Floors" }, ...ordered.map((f) => ({ id: f.id, label: f.label }))].map((f) => (
        <button
          key={f.id}
          type="button"
          aria-pressed={selectedFloorId === f.id}
          onClick={() => onSelect(f.id)}
          className={cn(
            "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange",
            selectedFloorId === f.id
              ? "border-moveit-orange bg-moveit-orange text-white"
              : "border-moveit-border bg-moveit-panel text-moveit-text hover:bg-moveit-surface"
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

export interface WarehouseFilterBarProps {
  zones: WarehouseVisualNode[];
  zoneId: string;
  status: LocationStatus | "ALL";
  query: string;
  hits: WarehouseVisualNode[];
  matchCount: number | null;
  onZone: (id: string) => void;
  onStatus: (s: LocationStatus | "ALL") => void;
  onQuery: (q: string) => void;
  onPickHit: (node: WarehouseVisualNode) => void;
  onClear: () => void;
}

const field =
  "h-8 rounded-lg border border-moveit-border bg-moveit-surface px-2 text-[11px] font-semibold text-moveit-text focus:outline-none focus:ring-2 focus:ring-moveit-orange cursor-pointer";

export function WarehouseFilterBar(p: WarehouseFilterBarProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const filtering = p.query.trim() !== "" || p.status !== "ALL" || p.zoneId !== "ALL";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-moveit-muted">
        Zone
        <select value={p.zoneId} onChange={(e) => p.onZone(e.target.value)} className={field} aria-label="Filter by zone">
          <option value="ALL">All zones ({p.zones.length})</option>
          {p.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-moveit-muted">
        Status
        <select value={p.status} onChange={(e) => p.onStatus(e.target.value as LocationStatus | "ALL")} className={field} aria-label="Filter by status">
          <option value="ALL">All statuses</option>
          {LOCATION_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {LOCATION_STATUS_3D[s].label}
            </option>
          ))}
        </select>
      </label>

      <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
        <Search aria-hidden className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-moveit-muted" />
        <input
          type="search"
          value={p.query}
          onChange={(e) => {
            p.onQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && p.hits[0]) {
              e.preventDefault();
              p.onPickHit(p.hits[0]);
              setOpen(false);
            }
          }}
          placeholder="Search floor, zone, row, rack, position… e.g. A-03"
          aria-label="Search floor, zone, row, rack or position"
          aria-controls={listId}
          className="h-8 w-full rounded-lg border border-moveit-border bg-moveit-surface pl-7 pr-2 text-[11px] text-moveit-text placeholder:text-moveit-dim focus:outline-none focus:ring-2 focus:ring-moveit-orange"
        />
        {open && p.hits.length > 0 && (
          <ul
            id={listId}
            className="absolute left-0 right-0 top-9 z-30 max-h-56 overflow-auto rounded-lg border border-moveit-border bg-moveit-panel p-1 shadow-xl"
          >
            {p.hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    p.onPickHit(h);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[11px] hover:bg-moveit-surface cursor-pointer"
                >
                  <span className="truncate font-semibold text-moveit-text">{h.label}</span>
                  <span className="shrink-0 text-[10px] uppercase text-moveit-muted">{NODE_TYPE_LABEL[h.type]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {filtering && (
        <>
          <span role="status" className="text-[11px] text-moveit-muted">
            {p.matchCount ?? 0} matching location{p.matchCount === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={p.onClear} className="text-[11px] font-semibold text-moveit-orange hover:underline cursor-pointer">
            Clear filters
          </button>
        </>
      )}
    </div>
  );
}
