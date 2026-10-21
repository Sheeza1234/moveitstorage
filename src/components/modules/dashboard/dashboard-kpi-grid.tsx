"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users, Warehouse, Layers, CheckCircle2, ShieldAlert, Sparkles, Truck } from "lucide-react";
import { MetricCard } from "@/components/ui/metric-card";
import { DashboardMetrics } from "@/types";
import { formatSqFt } from "@/lib/utils";

export interface DashboardKPIGridProps {
  metrics: DashboardMetrics;
}

export function DashboardKPIGrid({ metrics }: DashboardKPIGridProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1900px]:grid-cols-7 gap-4">
      {/* 1. Total Customers */}
      <MetricCard
        title="Total Customers"
        value={metrics.totalCustomers}
        subtitle={`${metrics.activeStorageCustomers} active storage`}
        icon={<Users className="h-5 w-5 text-moveit-orange" />}
        trend={{ value: "+12%", isPositive: true, label: "this month" }}
        onClick={() => router.push("/customers")}
      />

      {/* 2. Active Storage Customers */}
      <MetricCard
        title="Active Storage"
        value={metrics.activeStorageCustomers}
        subtitle="Across 3 facilities"
        icon={<CheckCircle2 className="h-5 w-5 text-moveit-success" />}
        badgeText={`${metrics.activeAllocationsCount} Allocations`}
        badgeVariant="success"
        onClick={() => router.push("/allocations")}
      />

      {/* 3. Total Capacity */}
      <MetricCard
        title="Total Capacity"
        value={formatSqFt(metrics.totalCapacitySqFt)}
        subtitle="Gross facility footprint"
        icon={<Warehouse className="h-5 w-5 text-moveit-orange" />}
        onClick={() => router.push("/warehouses")}
      />

      {/* 4. Occupied Capacity */}
      <MetricCard
        title="Occupied Capacity"
        value={formatSqFt(metrics.occupiedCapacitySqFt)}
        subtitle={`${((metrics.occupiedCapacitySqFt / metrics.totalCapacitySqFt) * 100).toFixed(1)}% footprint`}
        icon={<Layers className="h-5 w-5 text-moveit-danger" />}
        badgeText="Red = Occupied"
        badgeVariant="danger"
        onClick={() => router.push("/warehouses")}
      />

      {/* 5. Reserved Capacity */}
      <MetricCard
        title="Reserved Capacity"
        value={formatSqFt(metrics.reservedCapacitySqFt)}
        subtitle="Pending intake allocations"
        icon={<Sparkles className="h-5 w-5 text-moveit-orange" />}
        badgeText="Orange = Reserved"
        badgeVariant="info"
        onClick={() => router.push("/allocations")}
      />

      {/* 6. Available Capacity */}
      <MetricCard
        title="Available Capacity"
        value={formatSqFt(metrics.availableCapacitySqFt)}
        subtitle="Ready for allocation"
        icon={<ShieldAlert className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        badgeText="Green = Available"
        badgeVariant="success"
        onClick={() => router.push("/warehouses")}
      />

      {/* 7. Pending Movements */}
      <MetricCard
        title="Pending Movements"
        value={metrics.pendingMovementsCount || 0}
        subtitle="Awaiting completion"
        icon={<Truck className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        badgeText={metrics.pendingMovementsCount ? `${metrics.pendingMovementsCount} Pending` : "0 Pending"}
        badgeVariant={metrics.pendingMovementsCount ? "warning" : "default"}
        onClick={() => router.push("/inventory")}
      />
    </div>
  );
}
