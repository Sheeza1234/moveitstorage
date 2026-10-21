"use client";

import { useCan } from "@/lib/use-can";
import * as React from "react";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { StorageAllocation } from "@/types";
import { AllocationSummary } from "@/types/allocation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatSqFt, formatDate } from "@/lib/utils";
import { Plus, Layers, CheckCircle2, Clock, ShieldAlert, Sparkles, Eye } from "lucide-react";

export default function AllocationsPage() {
  const can = useCan();
  const router = useRouter();

  const [allocations, setAllocations] = React.useState<StorageAllocation[]>([]);
  const [summary, setSummary] = React.useState<AllocationSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [list, summaryData] = await Promise.all([
        services.allocationService.getAllocations(),
        services.allocationService.getAllocationSummary(),
      ]);
      setAllocations(list);
      setSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load storage allocations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    Promise.all([
      services.allocationService.getAllocations(),
      services.allocationService.getAllocationSummary(),
    ])
      .then(([list, summaryData]) => {
        if (!active) return;
        setAllocations(list);
        setSummary(summaryData);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load storage allocations.");
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Filtered allocations
  const filteredAllocations = React.useMemo(() => {
    return allocations.filter((a) => {
      const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
      const matchesType = typeFilter === "ALL" || a.storageType === typeFilter;
      return matchesStatus && matchesType;
    });
  }, [allocations, statusFilter, typeFilter]);

  const columns: ColumnDef<StorageAllocation>[] = [
    {
      key: "allocationCode",
      header: "Allocation ID",
      sortable: true,
      cell: (a) => (
        <div className="space-y-0.5">
          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
            {a.allocationCode}
          </span>
          {a.aiRecommended && (
            <span className="block text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              ✨ AI Recommended
            </span>
          )}
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer Account",
      sortable: true,
      cell: (a) => (
        <div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{a.customerName}</div>
          <span className="text-[11px] text-slate-400">{a.storageType} Storage</span>
        </div>
      ),
    },
    {
      key: "locationPath",
      header: "Warehouse & Target Location",
      sortable: true,
      cell: (a) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-200">{a.locationPath}</div>
          <span className="text-[11px] text-slate-400">{a.warehouseName}</span>
        </div>
      ),
    },
    {
      key: "allocatedCapacity",
      header: "Capacity",
      sortable: true,
      cell: (a) => (
        <span className="font-bold text-slate-900 dark:text-slate-100">
          {formatSqFt(a.allocatedCapacity)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      cell: (a) => (
        <StatusBadge
          status={
            a.status === "ACTIVE" || a.status === "CONFIRMED"
              ? "VALID"
              : a.status === "RECOMMENDED" || a.status === "PENDING_REVIEW"
              ? "PENDING"
              : "EXPIRED"
          }
        />
      ),
    },
    {
      key: "startDate",
      header: "Lease Dates",
      sortable: true,
      cell: (a) => (
        <div className="text-xs">
          <div className="font-medium text-slate-800 dark:text-slate-200">{formatDate(a.startDate)}</div>
          <span className="text-slate-400 text-[11px]">To {formatDate(a.expectedEndDate)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (a) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/allocations/${a.id}`);
          }}
          className="h-8 px-2 text-blue-600 hover:text-blue-700"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          View
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState message="Loading storage allocations directory..." className="py-24" />;
  }

  if (error || !summary) {
    return <ErrorState message={error || "Failed to load allocations."} onRetry={loadData} className="my-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Storage Allocations & Reservations"
        description="Manage customer storage requirements, capacity reservations, AI recommendations, and confirmed allocations."
        breadcrumbs={[{ label: "Storage Allocations", isCurrent: true }]}
        actions={
          can("ALLOCATIONS", "CREATE") && (
<Button
            variant="primary"
            size="md"
            onClick={() => router.push("/allocations/new")}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="h-4 w-4" />
            <span>New Allocation Wizard</span>
          </Button>
)
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Allocations"
          value={summary.totalAllocations}
          subtitle="All recorded allocations"
          icon={<Layers className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Active Allocations"
          value={summary.activeAllocations}
          subtitle="Occupying space"
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          badgeText="Active"
          badgeVariant="success"
        />
        <MetricCard
          title="Reserved Footprint"
          value={formatSqFt(summary.totalReservedCapacitySqFt)}
          subtitle="Committed reservations"
          icon={<Sparkles className="h-5 w-5 text-purple-600" />}
          badgeText="Blue = Reserved"
          badgeVariant="info"
        />
        <MetricCard
          title="Occupied Footprint"
          value={formatSqFt(summary.totalOccupiedCapacitySqFt)}
          subtitle="Physically stored"
          icon={<ShieldAlert className="h-5 w-5 text-rose-600" />}
          badgeText="Red = Occupied"
          badgeVariant="danger"
        />
        <MetricCard
          title="Pending Review"
          value={summary.pendingAllocations}
          subtitle="Awaiting admin action"
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          badgeText="Pending"
          badgeVariant="warning"
        />
      </div>

      {/* Toolbar Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-48">
            <Select
              label="Allocation Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "ACTIVE", label: "Active" },
                { value: "CONFIRMED", label: "Confirmed" },
                { value: "RECOMMENDED", label: "AI Recommended" },
                { value: "PENDING_REVIEW", label: "Pending Review" },
                { value: "RELEASED", label: "Released" },
              ]}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              label="Storage Model Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Storage Models" },
                { value: "RACK", label: "Rack Storage" },
                { value: "SHELF", label: "Shelf Storage" },
                { value: "FLOOR", label: "Open Floor Bay" },
                { value: "SLOT", label: "Vault Slot" },
              ]}
            />
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredAllocations.length} of {allocations.length} allocations
        </span>
      </div>

      {/* Allocation DataTable */}
      <DataTable
        data={filteredAllocations}
        columns={columns}
        keyExtractor={(a) => a.id}
        searchPlaceholder="Search allocation ID, customer, warehouse, or location path..."
        searchableKey={(a) => `${a.allocationCode} ${a.customerName} ${a.warehouseName} ${a.locationPath}`}
        onRowClick={(a) => router.push(`/allocations/${a.id}`)}
      />
    </div>
  );
}
