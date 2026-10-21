"use client";

import * as React from "react";
import { CapacityUnit } from "@/types";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { LOCATION_STATUS_3D, WarehouseVisualNode } from "@/lib/utils/warehouse-visual-adapter";
import { LocationStatusPill } from "./warehouse-status-legend";

export const NODE_TYPE_LABEL: Record<WarehouseVisualNode["type"], string> = {
  warehouse: "Warehouse",
  floor: "Floor",
  zone: "Zone",
  row: "Row",
  rack: "Rack",
  shelf: "Level",
  slot: "Position",
};

export function formatCapacity(value: number, unit: CapacityUnit) {
  return `${value.toLocaleString()} ${unit === "CU_FT" ? "CU.FT" : "SQ.FT"}`;
}

export function utilizationOf(node: WarehouseVisualNode): number | undefined {
  if (node.capacity === undefined || node.capacity <= 0) return undefined;
  return calculateLocationCapacity(node.capacity, node.occupied ?? 0, node.reserved ?? 0).utilizationPercentage;
}

export function countsText(node: WarehouseVisualNode): string {
  const c = node.counts;
  if (!c) return "";
  const parts: string[] = [];
  if (node.type === "floor" || node.type === "zone") if (c.rows) parts.push(`${c.rows} row${c.rows === 1 ? "" : "s"}`);
  if (node.type !== "rack" && c.racks) parts.push(`${c.racks} rack${c.racks === 1 ? "" : "s"}`);
  if (c.positions) parts.push(`${c.positions} position${c.positions === 1 ? "" : "s"}`);
  if (c.bays) parts.push(`${c.bays} bay${c.bays === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

export interface WarehouseLocationTooltipProps {
  node: WarehouseVisualNode | null;
  unit: CapacityUnit;
}

let lastPointer = { x: 0, y: 0 };

/** Hover tooltip. Shows only values that exist in the data; follows the pointer without re-rendering. */
export function WarehouseLocationTooltip({ node, unit }: WarehouseLocationTooltipProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  const place = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pad = 14;
    const { innerWidth, innerHeight } = window;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const x = Math.min(innerWidth - w - 8, lastPointer.x + pad);
    const y = lastPointer.y + pad + h > innerHeight ? lastPointer.y - h - pad : lastPointer.y + pad;
    el.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
  }, []);

  React.useEffect(() => {
    const onMove = (e: PointerEvent) => {
      lastPointer = { x: e.clientX, y: e.clientY };
      place();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [place]);

  React.useLayoutEffect(() => {
    if (node) place();
  }, [node, place]);

  if (!node) return null;

  const isPosition = node.type === "slot";
  const util = utilizationOf(node);
  const rows: [string, string][] = [];
  if (!node.unlinked) {
    if (isPosition || node.type === "shelf") {
      if (node.capacity !== undefined) rows.push(["Capacity", formatCapacity(node.capacity, unit)]);
      if (node.occupied !== undefined) rows.push(["Occupied", formatCapacity(node.occupied, unit)]);
      if (node.reserved !== undefined) rows.push(["Reserved", formatCapacity(node.reserved, unit)]);
      if (node.available !== undefined) rows.push(["Available", formatCapacity(node.available, unit)]);
    } else {
      if (util !== undefined) rows.push(["Utilized", `${util}%${node.derived ? " (from positions)" : ""}`]);
      const ct = countsText(node);
      if (ct) rows.push(["Contains", ct]);
      if (node.capacity !== undefined) rows.push(["Capacity", formatCapacity(node.capacity, unit)]);
    }
  }

  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ position: "fixed", left: 0, top: 0, transform: "translate(-9999px,-9999px)" }}
      className="pointer-events-none z-50 w-64 rounded-xl border border-moveit-border bg-moveit-panel/95 p-3 text-moveit-text shadow-2xl backdrop-blur"
    >
      <div className="mb-2 flex items-start justify-between gap-2 border-b border-moveit-border-soft pb-2">
        <div className="min-w-0">
          <span className="text-[9px] font-bold uppercase tracking-wider text-moveit-orange">{NODE_TYPE_LABEL[node.type]}</span>
          <h5 className="truncate text-xs font-bold">{node.label}</h5>
          {node.code && <p className="truncate font-mono text-[10px] text-moveit-muted">{node.code}</p>}
        </div>
        {node.status && !node.unlinked && (isPosition || node.type === "rack") && <LocationStatusPill status={node.status} />}
      </div>
      {node.unlinked ? (
        <p className="text-[11px] text-moveit-muted">Layout position with no storage record linked.</p>
      ) : (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          {rows.map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-moveit-muted">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </React.Fragment>
          ))}
        </dl>
      )}
      {node.isDemo && <p className="mt-2 text-[10px] font-semibold text-amber-500">Demo test data</p>}
      {node.status && !node.unlinked && <span className="sr-only">{LOCATION_STATUS_3D[node.status].label}</span>}
    </div>
  );
}
