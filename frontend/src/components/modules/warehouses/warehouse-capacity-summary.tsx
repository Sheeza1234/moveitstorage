"use client";

import * as React from "react";
import { CapacityUnit } from "@/types";
import { LOCATION_STATUS_3D } from "@/lib/utils/warehouse-visual-adapter";
import { formatCapacity } from "./warehouse-location-tooltip";

export interface WarehouseCapacitySummaryProps {
  scopeLabel: string;
  unit: CapacityUnit;
  totalCapacity: number;
  occupied: number;
  reserved: number;
  available: number;
  utilization: number;
}

/**
 * Numeric capacity summary. Pure renderer: every value is supplied by the existing capacity
 * helper / warehouse service. Nothing is computed or mutated here.
 */
export function WarehouseCapacitySummary({
  scopeLabel,
  unit,
  totalCapacity,
  occupied,
  reserved,
  available,
  utilization,
}: WarehouseCapacitySummaryProps) {
  const consistent = totalCapacity === occupied + reserved + available;
  const R = 15.9155;
  const seg = (value: number) => (totalCapacity > 0 ? (value / totalCapacity) * 100 : 0);
  const segments = [
    { key: "OCCUPIED" as const, value: occupied },
    { key: "RESERVED" as const, value: reserved },
    { key: "AVAILABLE" as const, value: available },
  ];
  let offset = 0;

  const cards = [
    { label: "Total capacity", value: totalCapacity, color: undefined as string | undefined },
    { label: "Occupied", value: occupied, color: LOCATION_STATUS_3D.OCCUPIED.hex },
    { label: "Reserved", value: reserved, color: LOCATION_STATUS_3D.RESERVED.hex },
    { label: "Available", value: available, color: LOCATION_STATUS_3D.AVAILABLE.hex },
  ];

  return (
    <section aria-label={`Capacity summary for ${scopeLabel}`} className="rounded-xl border border-moveit-border bg-moveit-panel p-4 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90" role="img" aria-label={`${utilization}% utilization`}>
              <circle cx="18" cy="18" r={R} fill="none" strokeWidth="4" className="stroke-moveit-border-soft" />
              {segments.map((s) => {
                const len = seg(s.value);
                const el = (
                  <circle
                    key={s.key}
                    cx="18"
                    cy="18"
                    r={R}
                    fill="none"
                    strokeWidth="4"
                    stroke={LOCATION_STATUS_3D[s.key].hex}
                    strokeDasharray={`${len} ${100 - len}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })}
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-sm font-extrabold text-moveit-text">{utilization}%</span>
              <span className="text-[8px] font-semibold uppercase text-moveit-muted">Utilization</span>
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-moveit-orange">Capacity summary</span>
            <h4 className="text-sm font-bold text-moveit-text">{scopeLabel}</h4>
            <p className="text-[11px] text-moveit-muted">Values from the warehouse capacity service</p>
          </div>
        </div>

        <dl className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-moveit-border bg-moveit-surface p-3">
              <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-moveit-muted">
                {c.color && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: c.color }} />}
                {c.label}
              </dt>
              <dd className="mt-1 text-base font-extrabold text-moveit-text">{formatCapacity(c.value, unit)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {!consistent && (
        <p role="alert" className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-moveit-text">
          Source data does not satisfy Total = Occupied + Reserved + Available for this scope. Figures are shown as received.
        </p>
      )}
    </section>
  );
}
