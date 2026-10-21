"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MovementLog } from "@/types";
import { ArrowLeftRight, Layers, PackageCheck, Receipt, FileWarning, CheckCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export interface RecentActivitySectionProps {
  movements: MovementLog[];
}

export function RecentActivitySection({ movements }: RecentActivitySectionProps) {
  // Static activities combined with dynamic movement logs
  const staticActivities = [
    {
      id: "act-01",
      title: "New Storage Allocation #SAL-2026-0094",
      description: "Allocated 800 SQ.FT to Horizon Interior Architecture in Dubai Hub > Zone B",
      timestamp: "2026-10-05T10:30:00Z",
      icon: Layers,
      color: "bg-[#e96d09]/15 text-[#e96d09] dark:bg-[#e96d09]/25 dark:text-[#f37423]",
    },
    {
      id: "act-04",
      title: "Monthly Storage Invoice #INV-2026-0945",
      description: "Generated AED 13,125.00 for Al Habtoor Commercial Group",
      timestamp: "2026-10-04T11:00:00Z",
      icon: Receipt,
      color: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
    {
      id: "act-05",
      title: "Document Expiry Alert Triggered",
      description: "Liability Insurance for Al Habtoor Group expires in 5 days",
      timestamp: "2026-10-03T16:20:00Z",
      icon: FileWarning,
      color: "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400",
    },
    {
      id: "act-06",
      title: "Storage Allocation Released #SAL-2026-0040",
      description: "Freed 500 SQ.FT in Abu Dhabi Facility Zone C following contract completion",
      timestamp: "2026-10-03T12:00:00Z",
      icon: CheckCircle,
      color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    },
  ];

  const movementActivities = movements.map((mov) => ({
    id: mov.id,
    title: `${mov.movementType === "IN" ? "Package Intaked" : mov.movementType === "MOVE" ? "Package Relocated" : "Package Dispatched"} (${mov.packageCode})`,
    description: `${mov.customerName} — ${mov.reason}`,
    timestamp: mov.timestamp,
    icon: mov.movementType === "IN" ? PackageCheck : ArrowLeftRight,
    color: mov.movementType === "IN" 
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
      : "bg-[#e96d09]/15 text-[#e96d09] dark:bg-[#e96d09]/25 dark:text-[#f37423]",
  }));

  const allActivities = [...movementActivities, ...staticActivities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Recent Storage Operations</CardTitle>
        <CardDescription>
          Live operational log of allocations, item intakes, package movements, and billing events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {allActivities.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative flex items-start gap-3.5 group">
                <div
                  className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-slate-900 ${item.color}`}
                >
                  <Icon className="h-3 w-3" />
                </div>
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
