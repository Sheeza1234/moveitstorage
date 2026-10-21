"use client";

import * as React from "react";
import { LocationStatus } from "@/types";
import { LOCATION_STATUS_3D, LOCATION_STATUS_ORDER } from "@/lib/utils/warehouse-visual-adapter";
import { cn } from "@/lib/utils";

/** Colour dot + text label. Colour is never the only status indicator. */
export function LocationStatusPill({ status, className }: { status: LocationStatus; className?: string }) {
  const cfg = LOCATION_STATUS_3D[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-moveit-border bg-moveit-surface px-2 py-0.5 text-[11px] font-semibold text-moveit-text",
        className
      )}
    >
      <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.hex }} />
      {cfg.label}
    </span>
  );
}

export interface WarehouseStatusLegendProps {
  /** Number of storage positions per status (a count of positions, not capacity). */
  counts: Record<LocationStatus, number>;
  /** Layout cells that have no storage record (ghosts). */
  unlinkedCount: number;
  activeStatus: LocationStatus | "ALL";
  onToggle: (status: LocationStatus | "ALL") => void;
}

export function WarehouseStatusLegend({ counts, unlinkedCount, activeStatus, onToggle }: WarehouseStatusLegendProps) {
  return (
    <div role="group" aria-label="Storage status legend. Select a status to filter positions." className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-moveit-muted">Status legend</span>
      {LOCATION_STATUS_ORDER.map((status) => {
        const cfg = LOCATION_STATUS_3D[status];
        const active = activeStatus === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(active ? "ALL" : status)}
            title={cfg.description}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange",
              active
                ? "border-moveit-orange bg-moveit-orange/10 text-moveit-text"
                : "border-moveit-border bg-moveit-panel text-moveit-muted hover:text-moveit-text"
            )}
          >
            <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.hex }} />
            <span>{cfg.label}</span>
            <span className="rounded bg-moveit-surface px-1 text-[10px] text-moveit-text">{counts[status]}</span>
          </button>
        );
      })}
      {unlinkedCount > 0 && (
        <span
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-moveit-border px-2.5 py-1 text-[11px] font-semibold text-moveit-muted"
          title="Layout position without a storage record behind it"
        >
          <span aria-hidden className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-400" />
          Not linked
          <span className="rounded bg-moveit-surface px-1 text-[10px] text-moveit-text">{unlinkedCount}</span>
        </span>
      )}
    </div>
  );
}
