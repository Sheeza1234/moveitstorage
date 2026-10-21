"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { Warehouse } from "@/types";
import { WarehouseCapacitySummary } from "@/services/interfaces/IWarehouseService";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { CapacityProgress } from "@/components/ui/capacity-progress";
import { WarehouseFormModal } from "@/components/modules/warehouses/warehouse-form-modal";
import { WarehouseFormValues } from "@/lib/validators/warehouse";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { Select } from "@/components/ui/select";
import { formatSqFt, formatDate } from "@/lib/utils";
import { Plus, Warehouse as WarehouseIcon, Building2, CheckCircle2, Layers, Eye, Edit3 } from "lucide-react";

export default function WarehousesPage() {
  const can = useCan();
  const router = useRouter();

  const [warehouses, setWarehouses] = React.useState<Warehouse[]>([]);
  const [summary, setSummary] = React.useState<WarehouseCapacitySummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [cityFilter, setCityFilter] = React.useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingWarehouse, setEditingWarehouse] = React.useState<Warehouse | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, summaryData] = await Promise.all([
        services.warehouseService.getWarehouses(),
        services.warehouseService.getWarehouseCapacitySummary(),
      ]);
      setWarehouses(list);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load warehouses.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.warehouseService.getWarehouses(),
      services.warehouseService.getWarehouseCapacitySummary(),
    ])
      .then(([list, summaryData]) => {
        if (!active) return;
        setWarehouses(list);
        setSummary(summaryData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load warehouses.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Unique cities list for filtering
  const uniqueCities = React.useMemo(() => {
    const cities = Array.from(new Set(warehouses.map((w) => w.city)));
    return cities.sort();
  }, [warehouses]);

  // Filtered warehouses
  const filteredWarehouses = React.useMemo(() => {
    return warehouses.filter((w) => {
      const matchesStatus = statusFilter === "ALL" || w.status === statusFilter;
      const matchesCity = cityFilter === "ALL" || w.city === cityFilter;
      return matchesStatus && matchesCity;
    });
  }, [warehouses, statusFilter, cityFilter]);

  const handleCreateOrUpdate = async (values: WarehouseFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingWarehouse) {
        await services.warehouseService.updateWarehouse(editingWarehouse.id, values);
      } else {
        await services.warehouseService.createWarehouse(values);
      }
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnDef<Warehouse>[] = [
    {
      key: "name",
      header: "Warehouse Name & Code",
      sortable: true,
      cell: (w) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-bold shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors">
              {w.name}
            </div>
            <span className="text-[11px] font-mono text-slate-400">{w.code}</span>
          </div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Location",
      sortable: true,
      cell: (w) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{w.city}</div>
          <span className="text-[11px] text-slate-400">{w.country}</span>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity Footprint",
      sortable: true,
      cell: (w) => (
        <div className="w-48">
          <CapacityProgress
            totalSqFt={w.totalCapacitySqFt}
            occupiedSqFt={w.occupiedSqFt}
            reservedSqFt={w.reservedSqFt}
            availableSqFt={w.availableSqFt}
            size="sm"
            showLegend={false}
          />
        </div>
      ),
    },
    {
      key: "utilizationPercentage",
      header: "Utilization",
      sortable: true,
      cell: (w) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {w.utilizationPercentage}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (w) => (
        <StatusBadge
          status={
            w.status === "ACTIVE"
              ? "AVAILABLE"
              : w.status === "MAINTENANCE"
              ? "BLOCKED"
              : "EXPIRED"
          }
        />
      ),
    },
    {
      key: "updatedAt",
      header: "Last Updated",
      sortable: true,
      cell: (w) => <span className="text-xs text-slate-500">{formatDate(w.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (w) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/warehouses/${w.id}`);
            }}
            className="h-8 px-2 text-blue-600 hover:text-blue-700"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setEditingWarehouse(w);
              setIsModalOpen(true);
            }}
            className="h-8 px-2 text-slate-600 hover:text-slate-900"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading MoveIt storage facilities..." className="py-24" />;
  }

  if (error || !summary) {
    return <ErrorState message={error || "Failed to load warehouses."} onRetry={loadData} className="my-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Warehouses & Storage Facilities"
        description="Configure physical warehouses, multi-level storage hierarchies, and spatial footprints."
        breadcrumbs={[{ label: "Warehouses", isCurrent: true }]}
        actions={
          can("WAREHOUSES", "CREATE") && (
<Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingWarehouse(null);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Add Warehouse</span>
          </Button>
)
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Warehouses"
          value={summary.totalWarehouses}
          subtitle="All registered hubs"
          icon={<WarehouseIcon className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Active Warehouses"
          value={summary.activeWarehouses}
          subtitle="Fully operational"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          badgeText="Active"
          badgeVariant="success"
        />
        <MetricCard
          title="Total Footprint"
          value={formatSqFt(summary.totalCapacitySqFt)}
          subtitle="Gross storage footprint"
          icon={<Building2 className="h-5 w-5 text-purple-600" />}
        />
        <MetricCard
          title="Occupied Space"
          value={formatSqFt(summary.occupiedSqFt)}
          subtitle={`${summary.utilizationPercentage}% occupied`}
          icon={<Layers className="h-5 w-5 text-rose-600" />}
          badgeText="Red = Occupied"
          badgeVariant="danger"
        />
        <MetricCard
          title="Available Space"
          value={formatSqFt(summary.availableSqFt)}
          subtitle="Ready for allocation"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          badgeText="Green = Available"
          badgeVariant="success"
        />
      </div>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "MAINTENANCE", label: "Maintenance" },
              ]}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              label="Filter by City"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Cities" },
                ...uniqueCities.map((city) => ({ value: city, label: city })),
              ]}
            />
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredWarehouses.length} of {warehouses.length} facilities
        </span>
      </div>

      {/* Main Warehouse Listing Table */}
      <DataTable
        data={filteredWarehouses}
        columns={columns}
        keyExtractor={(w) => w.id}
        searchPlaceholder="Search warehouse name, code, or location..."
        searchableKey={(w) => `${w.name} ${w.code} ${w.city} ${w.country}`}
        onRowClick={(w) => router.push(`/warehouses/${w.id}`)}
      />

      {/* Create / Edit Warehouse Modal */}
      <WarehouseFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingWarehouse}
        isLoading={isSubmitting}
      />
    </div>
  );
}
