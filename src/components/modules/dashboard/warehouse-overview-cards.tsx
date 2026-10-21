"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CapacityProgress } from "@/components/ui/capacity-progress";
import { Warehouse } from "@/types";
import { MapPin, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WarehouseOverviewCardsProps {
  warehouses: Warehouse[];
}

export function WarehouseOverviewCards({ warehouses }: WarehouseOverviewCardsProps) {
  const router = useRouter();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Storage Facilities Overview</CardTitle>
            <CardDescription>
              Capacity, utilization percentages, and status breakdown by physical location
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/warehouses")}
            className="text-xs gap-1.5"
          >
            <span>Manage Warehouses</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <div
              key={wh.id}
              onClick={() => router.push(`/warehouses`)}
              className="flex flex-col justify-between rounded-xl border border-moveit-border bg-moveit-panel p-4 shadow-xs hover:border-moveit-orange hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-moveit-orange/15 text-moveit-orange font-bold">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-moveit-text group-hover:text-moveit-orange transition-colors">
                        {wh.name}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-moveit-muted mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0 text-moveit-dim" />
                        <span className="truncate">{wh.city}, {wh.country}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <CapacityProgress
                  totalSqFt={wh.totalCapacitySqFt}
                  occupiedSqFt={wh.occupiedSqFt}
                  reservedSqFt={wh.reservedSqFt}
                  availableSqFt={wh.availableSqFt}
                  size="sm"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-moveit-border-soft flex items-center justify-between text-xs text-moveit-muted font-medium">
                <span>{wh.activeAllocationsCount} Active Allocations</span>
                <span className="text-moveit-orange font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                  View Hierarchy <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
