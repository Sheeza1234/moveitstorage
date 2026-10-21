"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { useUIStore } from "@/store/use-ui-store";
import { DashboardMetrics, Warehouse, OperationalAlert, MovementLog } from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardKPIGrid } from "@/components/modules/dashboard/dashboard-kpi-grid";
import { CapacityOverviewSection } from "@/components/modules/dashboard/capacity-overview-section";
import { UtilizationChart } from "@/components/modules/dashboard/utilization-chart";
import { RecentActivitySection } from "@/components/modules/dashboard/recent-activity-section";
import { AttentionAlertsSection } from "@/components/modules/dashboard/attention-alerts-section";
import { WarehouseOverviewCards } from "@/components/modules/dashboard/warehouse-overview-cards";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, Building2 } from "lucide-react";

export default function OperationalDashboardPage() {
  const router = useRouter();
  const { selectedWarehouseId, setSelectedWarehouseId } = useUIStore();

  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [alerts, setAlerts] = React.useState<OperationalAlert[]>([]);
  const [movements, setMovements] = React.useState<MovementLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadDashboardData = React.useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [metricsData, warehousesData, alertsData, movementsData] = await Promise.all([
        services.dashboardService.getMetrics(selectedWarehouseId),
        services.dashboardService.getWarehousesOverview(),
        services.dashboardService.getRecentAlerts(),
        services.dashboardService.getRecentMovements(),
      ]);

      setMetrics(metricsData);
      setWarehouses(warehousesData);
      setAlerts(alertsData);
      setMovements(movementsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operational dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedWarehouseId]);

  React.useEffect(() => {
    let active = true;
    
    services.dashboardService.getMetrics(selectedWarehouseId).then((metricsData) => {
      if (!active) return;
      Promise.all([
        services.dashboardService.getWarehousesOverview(),
        services.dashboardService.getRecentAlerts(),
        services.dashboardService.getRecentMovements(),
      ]).then(([warehousesData, alertsData, movementsData]) => {
        if (!active) return;
        setMetrics(metricsData);
        setWarehouses(warehousesData);
        setAlerts(alertsData);
        setMovements(movementsData);
        setIsLoading(false);
      }).catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load operational dashboard data.");
        setIsLoading(false);
      });
    }).catch((err) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : "Failed to load operational dashboard data.");
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [selectedWarehouseId]);

  if (isLoading) {
    return <LoadingState message="Fetching MoveIt storage operational metrics..." className="py-24" />;
  }

  if (error || !metrics) {
    return (
      <ErrorState
        title="Dashboard Error"
        message={error || "Could not retrieve storage metrics."}
        onRetry={() => loadDashboardData(true)}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Operational Dashboard"
        description="Comprehensive real-time overview of MoveIt storage capacity, allocations, document compliance, and recent movements."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDashboardData(true)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/allocations/new")}
              className="gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Allocation</span>
            </Button>
          </div>
        }
      />

      {/* Warehouse Context Selector Pill Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Building2 className="h-4 w-4 text-blue-600" />
          <span>Facility Context Filter:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedWarehouseId("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedWarehouseId === "ALL"
                ? "bg-moveit-orange text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            All Facilities (Global)
          </button>
          {warehouses.map((wh) => (
            <button
              key={wh.id}
              onClick={() => setSelectedWarehouseId(wh.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedWarehouseId === wh.id
                  ? "bg-moveit-orange text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {wh.name.split("—")[1]?.trim() || wh.name}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Main KPI Cards Grid */}
      <DashboardKPIGrid metrics={metrics} />

      {/* 2. Capacity Overview + Utilization Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CapacityOverviewSection metrics={metrics} />
        <UtilizationChart />
      </div>

      {/* 3. Action Required Alerts + Recent Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttentionAlertsSection alerts={alerts} />
        <RecentActivitySection movements={movements} />
      </div>

      {/* 4. Warehouse Facilities Cards Overview */}
      <WarehouseOverviewCards warehouses={warehouses} />
    </div>
  );
}
