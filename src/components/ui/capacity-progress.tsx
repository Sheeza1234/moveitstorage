import * as React from "react";
import { cn, formatSqFt } from "@/lib/utils";

export interface CapacityProgressProps {
  totalSqFt: number;
  occupiedSqFt: number;
  reservedSqFt: number;
  availableSqFt: number;
  showLabels?: boolean;
  showLegend?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CapacityProgress({
  totalSqFt,
  occupiedSqFt,
  reservedSqFt,
  availableSqFt,
  showLabels = true,
  showLegend = true,
  size = "md",
  className,
}: CapacityProgressProps) {
  const safeTotal = Math.max(1, totalSqFt);
  const occupiedPct = Math.min(100, Math.max(0, (occupiedSqFt / safeTotal) * 100));
  const reservedPct = Math.min(100 - occupiedPct, Math.max(0, (reservedSqFt / safeTotal) * 100));
  const availablePct = Math.max(0, 100 - occupiedPct - reservedPct);

  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4.5",
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Capacity Utilization
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {(occupiedPct + reservedPct).toFixed(1)}% <span className="font-normal text-slate-500">of {formatSqFt(totalSqFt)}</span>
          </span>
        </div>
      )}

      {/* Stacked Progress Bar */}
      <div className={cn("relative w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 flex", heights[size])}>
        {/* Occupied (Red/Rose) */}
        {occupiedPct > 0 && (
          <div
            style={{ width: `${occupiedPct}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`Occupied: ${formatSqFt(occupiedSqFt)} (${occupiedPct.toFixed(1)}%)`}
          />
        )}
        {/* Reserved (Blue) */}
        {reservedPct > 0 && (
          <div
            style={{ width: `${reservedPct}%` }}
            className="bg-blue-500 transition-all duration-500"
            title={`Reserved: ${formatSqFt(reservedSqFt)} (${reservedPct.toFixed(1)}%)`}
          />
        )}
        {/* Available (Emerald/Green) */}
        {availablePct > 0 && (
          <div
            style={{ width: `${availablePct}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Available: ${formatSqFt(availableSqFt)} (${availablePct.toFixed(1)}%)`}
          />
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Occupied: <strong className="text-slate-800 dark:text-slate-200">{formatSqFt(occupiedSqFt)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Reserved: <strong className="text-slate-800 dark:text-slate-200">{formatSqFt(reservedSqFt)}</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Available: <strong className="text-slate-800 dark:text-slate-200">{formatSqFt(availableSqFt)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
