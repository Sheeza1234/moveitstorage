"use client";

import * as React from "react";
import { WarehouseVisualModel, LOCATION_STATUS_3D } from "@/lib/utils/warehouse-visual-adapter";
import { CapacityUnit } from "@/types";
import { formatCapacity } from "./warehouse-location-tooltip";
import { cn } from "@/lib/utils";

const ROW_CAP = 300;

export interface WarehouseLocationListProps {
  model: WarehouseVisualModel;
  unit: CapacityUnit;
  matchIds: Set<string> | null;
  selectedId: string | null;
  selectedFloorId: string;
  defaultOpen: boolean;
  onSelect: (id: string) => void;
}

/** Text/keyboard alternative to the 3D scene: every storage location as a table. */
export function WarehouseLocationList({ model, unit, matchIds, selectedId, selectedFloorId, defaultOpen, onSelect }: WarehouseLocationListProps) {
  const all = model.slots.filter(
    (s) => (selectedFloorId === "ALL" || s.floorId === selectedFloorId) && (!matchIds || matchIds.has(s.id))
  );
  const rows = all.slice(0, ROW_CAP);

  return (
    <details open={defaultOpen} className="group border-t border-moveit-border-soft">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-xs font-semibold text-moveit-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange">
        Location list (text view) · {all.length} position{all.length === 1 ? "" : "s"}
      </summary>
      <div className="max-h-72 overflow-auto px-4 pb-4">
        {all.length > ROW_CAP && (
          <p className="py-2 text-[11px] text-moveit-muted">Showing the first {ROW_CAP} of {all.length}. Use the search or filters to narrow the list.</p>
        )}
        {rows.length === 0 ? (
          <p className="py-3 text-xs text-moveit-muted">No storage locations match the current view.</p>
        ) : (
          <table className="w-full min-w-[520px] text-left text-[11px]">
            <caption className="sr-only">Storage locations of {model.root.name}</caption>
            <thead className="text-[10px] uppercase tracking-wider text-moveit-muted">
              <tr>
                <th scope="col" className="py-1.5 pr-2">Location</th>
                <th scope="col" className="py-1.5 pr-2">Path</th>
                <th scope="col" className="py-1.5 pr-2">Status</th>
                <th scope="col" className="py-1.5 text-right">Available</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={cn("border-t border-moveit-border-soft", selectedId === s.id && "bg-moveit-orange/10")}>
                  <th scope="row" className="py-1.5 pr-2 font-semibold">
                    <button
                      type="button"
                      onClick={() => onSelect(s.id)}
                      aria-current={selectedId === s.id}
                      className="text-left text-moveit-orange hover:underline cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange"
                    >
                      {s.code ?? s.label}
                    </button>
                  </th>
                  <td className="max-w-[260px] truncate py-1.5 pr-2 text-moveit-muted" title={s.path}>{s.path}</td>
                  <td className="py-1.5 pr-2">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: s.status ? LOCATION_STATUS_3D[s.status].hex : "#6b7280" }} />
                      {s.unlinked ? "Not linked" : s.status ? LOCATION_STATUS_3D[s.status].label : "—"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">{s.available !== undefined ? formatCapacity(s.available, unit) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
