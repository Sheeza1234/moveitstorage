"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CapacityProgress } from "@/components/ui/capacity-progress";
import { DashboardMetrics } from "@/types";
import { formatSqFt } from "@/lib/utils";

export interface CapacityOverviewSectionProps {
  metrics: DashboardMetrics;
}

export function CapacityOverviewSection({ metrics }: CapacityOverviewSectionProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle>Warehouse Capacity Breakdown</CardTitle>
            <CardDescription>
              Real-time footprint distribution across all MoveIt storage centers
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-[#e96d09] dark:text-[#f37423]">
              {metrics.occupancyPercentage}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
              Overall Utilization Rate
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CapacityProgress
          totalSqFt={metrics.totalCapacitySqFt}
          occupiedSqFt={metrics.occupiedCapacitySqFt}
          reservedSqFt={metrics.reservedCapacitySqFt}
          availableSqFt={metrics.availableCapacitySqFt}
          size="lg"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Space
            </span>
            <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatSqFt(metrics.totalCapacitySqFt)}
            </p>
          </div>
          <div className="rounded-lg bg-rose-50/50 p-3.5 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/40">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
              Occupied (RED)
            </span>
            <p className="text-lg font-bold text-rose-900 dark:text-rose-200">
              {formatSqFt(metrics.occupiedCapacitySqFt)}
            </p>
          </div>
          <div className="rounded-lg bg-[#e96d09]/10 p-3.5 border border-[#e96d09]/20 dark:bg-[#e96d09]/15 dark:border-[#e96d09]/30">
            <span className="text-[11px] font-semibold text-[#e96d09] dark:text-[#f37423] uppercase tracking-wider">
              Reserved (ORANGE)
            </span>
            <p className="text-lg font-bold text-[#e96d09] dark:text-[#f37423]">
              {formatSqFt(metrics.reservedCapacitySqFt)}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50/50 p-3.5 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Available (GREEN)
            </span>
            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
              {formatSqFt(metrics.availableCapacitySqFt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
