"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { 
  MovementRecord, 
  MovementSummary, 
  Customer 
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatDate } from "@/lib/utils";
import { 
  ArrowLeft, 
  ArrowLeftRight, 
  ArrowDownRight, 
  ArrowUpRight, 
  Boxes, 
  Search, 
  Filter, 
  Building2 
} from "lucide-react";

export default function InventoryMovementsPage() {
  const router = useRouter();

  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [summary, setSummary] = useState<MovementSummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [customerFilter, setCustomerFilter] = useState<string>("ALL");

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [movs, summ, custs] = await Promise.all([
          services.movementService.getMovements(),
          services.movementService.getMovementSummary(),
          services.customerService.getCustomers(),
        ]);

        if (active) {
          setMovements(movs);
          setSummary(summ);
          setCustomers(custs);
        }
      } catch (err: unknown) {
        if (active) setError((err as Error).message || "Failed to load movement logs.");
      } finally {
        if (active) setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      searchQuery === "" ||
      m.movementCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.packageCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.fromLocationPath && m.fromLocationPath.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.toLocationPath && m.toLocationPath.toLowerCase().includes(searchQuery.toLowerCase())) ||
      m.reason.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === "ALL" ||
      m.movementType === typeFilter ||
      (typeFilter === "INTERNAL_MOVE" && m.movementType === "MOVE");

    const matchesCustomer = customerFilter === "ALL" || m.customerId === customerFilter;

    return matchesSearch && matchesType && matchesCustomer;
  });

  const columns: ColumnDef<MovementRecord>[] = [
    {
      key: "movementCode",
      header: "Movement Code",
      cell: (item) => (
        <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
          {item.movementCode || item.id}
        </span>
      ),
    },
    {
      key: "packageCode",
      header: "Inventory / Package",
      cell: (item) => (
        <div>
          <Link
            href={`/inventory/${item.inventoryId || item.packageId}`}
            className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {item.packageCode}
          </Link>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      cell: (item) => (
        <span className="font-medium text-slate-800 dark:text-slate-200 text-xs">
          {item.customerName}
        </span>
      ),
    },
    {
      key: "movementType",
      header: "Movement Type",
      cell: (item) => {
        const type = item.movementType;
        if (type === "IN") {
          return (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <ArrowDownRight className="w-3 h-3" />
              <span>INTAKE (IN)</span>
            </span>
          );
        }
        if (type === "OUT") {
          return (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <ArrowUpRight className="w-3 h-3" />
              <span>RELEASE (OUT)</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            <ArrowLeftRight className="w-3 h-3" />
            <span>INTERNAL MOVE</span>
          </span>
        );
      },
    },
    {
      key: "fromLocationPath",
      header: "From Location",
      cell: (item) => (
        <span className="text-xs text-slate-500 font-mono truncate max-w-[150px] block" title={item.fromLocationPath || "Origin"}>
          {item.fromLocationPath || "Receiving Bay / Staging"}
        </span>
      ),
    },
    {
      key: "toLocationPath",
      header: "To Location",
      cell: (item) => (
        <span className="text-xs text-slate-500 font-mono truncate max-w-[150px] block" title={item.toLocationPath || "Destination"}>
          {item.toLocationPath || "Dispatch Bay"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (item) => (
        <span className="font-bold text-slate-900 dark:text-white text-xs">
          {item.quantity} items
        </span>
      ),
    },
    {
      key: "performedBy",
      header: "Operator / Performed By",
      cell: (item) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          {item.performedBy || (item as MovementRecord & { operatorName?: string }).operatorName || "Operations Staff"}
        </span>
      ),
    },
    {
      key: "timestamp",
      header: "Timestamp",
      cell: (item) => (
        <span className="text-[11px] text-slate-400">
          {formatDate(item.timestamp)}
        </span>
      ),
    },
  ];

  if (loading) {
    return <LoadingState message="Fetching Movement Log records..." className="py-24" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Movement Service Error"
        message={error}
        onRetry={() => window.location.reload()}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inventory Directory</span>
        </Link>

        <PageHeader
          title="Inventory Movement Audit Logs"
          description="Complete chronological record of physical intake (IN), customer release (OUT), and internal warehouse slot transfers."
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/inventory")}
              className="gap-1.5 text-xs"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span>Back to Directory</span>
            </Button>
          }
        />
      </div>

      {/* Movement Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Movements"
          value={summary?.totalMovements || 0}
          subtitle="Audit Trail Events"
          icon={<ArrowLeftRight className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Physical Intakes (IN)"
          value={summary?.itemsInCount || 0}
          subtitle="Items Stored"
          icon={<ArrowDownRight className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Dispatches (OUT)"
          value={summary?.itemsOutCount || 0}
          subtitle="Items Released"
          icon={<ArrowUpRight className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          title="Internal Moves"
          value={summary?.internalMovesCount || 0}
          subtitle="Location Transfers"
          icon={<Building2 className="h-5 w-5 text-purple-600" />}
        />
      </div>

      {/* Controls & Search / Filter Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Movement Code, Package, Location, Reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Movement Types" },
                { value: "IN", label: "Physical Intakes (IN)" },
                { value: "OUT", label: "Dispatches / Releases (OUT)" },
                { value: "INTERNAL_MOVE", label: "Internal Moves" },
              ]}
              className="text-xs"
            />

            <Select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Customers" },
                ...customers.map((c) => ({ value: c.id, label: c.name })),
              ]}
              className="text-xs"
            />
          </div>

        </div>
      </div>

      {/* Main Movement History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredMovements}
          keyExtractor={(item) => item.id}
          searchableKey="reason"
        />
      </div>
    </div>
  );
}
