"use client";

import { useCan } from "@/lib/use-can";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { services } from "@/services";
import { 
  InventoryRecord, 
  InventorySummary, 
  Customer, 
  StorageAllocation, 
  Warehouse, 
  PackageType
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DataTable, ColumnDef } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { formatSqFt, formatDate } from "@/lib/utils";
import { 
  Boxes, 
  Package, 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Search, 
  Filter, 
  Eye, 
  Truck, 
  Layers, 
  AlertCircle,
  X,
  CheckCircle2,
  RefreshCw
} from "lucide-react";

export default function InventoryDirectoryPage() {
  const can = useCan();
  const router = useRouter();

  const [records, setRecords] = useState<InventoryRecord[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allocations, setAllocations] = useState<StorageAllocation[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [warehouseFilter, setWarehouseFilter] = useState<string>("ALL");
  const [packageTypeFilter, setPackageTypeFilter] = useState<string>("ALL");

  // Items In Modal State
  const [showItemsInModal, setShowItemsInModal] = useState(false);
  const [inCustomerId, setInCustomerId] = useState("");
  const [inAllocationId, setInAllocationId] = useState("");
  const [inWarehouseId, setInWarehouseId] = useState("");
  const [inLocationId, setInLocationId] = useState("");
  const [inPackageType, setInPackageType] = useState<PackageType>("CRATE");
  const [inItemCount, setInItemCount] = useState<number>(10);
  const [inFootprint, setInFootprint] = useState<number>(150);
  const [inDescription, setInDescription] = useState("");
  const [inNotes, setInNotes] = useState("");
  const [inErrorMsg, setInErrorMsg] = useState<string | null>(null);
  const [inActionLoading, setInActionLoading] = useState(false);

  // Items Out Modal State
  const [showItemsOutModal, setShowItemsOutModal] = useState(false);
  const [outInventoryId, setOutInventoryId] = useState("");
  const [outQuantity, setOutQuantity] = useState<number>(1);
  const [outReason, setOutReason] = useState("");
  const [outErrorMsg, setOutErrorMsg] = useState<string | null>(null);
  const [outActionLoading, setOutActionLoading] = useState(false);

  const fetchInventoryData = React.useCallback(async () => {
    try {
      const [recs, summ, custs, allocs, whs] = await Promise.all([
        services.inventoryService.getInventoryRecords(),
        services.inventoryService.getInventorySummary(),
        services.customerService.getCustomers(),
        services.allocationService.getAllocations(),
        services.warehouseService.getWarehouses(),
      ]);

      setRecords(recs);
      setSummary(summ);
      setCustomers(custs);
      setAllocations(allocs);
      setWarehouses(whs);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load inventory records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [recs, summ, custs, allocs, whs] = await Promise.all([
          services.inventoryService.getInventoryRecords(),
          services.inventoryService.getInventorySummary(),
          services.customerService.getCustomers(),
          services.allocationService.getAllocations(),
          services.warehouseService.getWarehouses(),
        ]);

        if (active) {
          setRecords(recs);
          setSummary(summ);
          setCustomers(custs);
          setAllocations(allocs);
          setWarehouses(whs);
        }
      } catch (err: unknown) {
        if (active) setError((err as Error).message || "Failed to load inventory records.");
      } finally {
        if (active) setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, []);

  // Derived filtered active allocations for the selected customer in intake modal
  const activeCustomerAllocations = allocations.filter(
    (a) => a.customerId === inCustomerId && (a.status === "CONFIRMED" || a.status === "ACTIVE")
  );

  // Derived slots for selected warehouse
  const selectedWarehouseObj = warehouses.find((w) => w.id === inWarehouseId);
  const availableSlots: { id: string; label: string }[] = [];
  if (selectedWarehouseObj) {
    if (selectedWarehouseObj.floors) {
      for (const fl of selectedWarehouseObj.floors) {
        for (const zn of fl.zones) {
          if (zn.racks) {
            for (const rk of zn.racks) {
              for (const sl of rk.slots) {
                availableSlots.push({
                  id: sl.id,
                  label: `${fl.name} > ${zn.name} > ${rk.name} > ${sl.name} (${sl.availableCapacitySqFt} SQ_FT avail)`,
                });
              }
            }
          }
          if (zn.directSlots) {
            for (const sl of zn.directSlots) {
              availableSlots.push({
                id: sl.id,
                label: `${fl.name} > ${zn.name} > ${sl.name} (${sl.availableCapacitySqFt} SQ_FT avail)`,
              });
            }
          }
        }
      }
    }
  }

  const handleRecordItemsIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setInActionLoading(true);
    setInErrorMsg(null);

    try {
      if (!inCustomerId || !inAllocationId || !inWarehouseId || !inLocationId) {
        throw new Error("Please complete all required selection fields (Customer, Allocation, Warehouse, Location).");
      }

      await services.inventoryService.recordItemsIn({
        customerId: inCustomerId,
        allocationId: inAllocationId,
        warehouseId: inWarehouseId,
        locationId: inLocationId,
        packageType: inPackageType,
        itemCount: inItemCount,
        capacityFootprintSqFt: inFootprint,
        capacityUnit: "SQ_FT",
        description: inDescription || "Stored Customer Inventory Package",
        notes: inNotes,
      });

      setShowItemsInModal(false);
      setInDescription("");
      setInNotes("");
      await fetchInventoryData();
    } catch (err: unknown) {
      setInErrorMsg((err as Error).message || "Failed to record items in.");
    } finally {
      setInActionLoading(false);
    }
  };

  const handleRecordItemsOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutActionLoading(true);
    setOutErrorMsg(null);

    try {
      if (!outInventoryId) {
        throw new Error("Please select an inventory record to release.");
      }

      await services.inventoryService.recordItemsOut({
        inventoryId: outInventoryId,
        releaseQuantity: outQuantity,
        reason: outReason || "Scheduled customer release dispatch",
      });

      setShowItemsOutModal(false);
      setOutReason("");
      await fetchInventoryData();
    } catch (err: unknown) {
      setOutErrorMsg((err as Error).message || "Failed to record items out.");
    } finally {
      setOutActionLoading(false);
    }
  };

  // Filtering records
  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      searchQuery === "" ||
      r.inventoryCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.packageId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.locationPath.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesWarehouse = warehouseFilter === "ALL" || r.warehouseId === warehouseFilter;
    const matchesPackageType = packageTypeFilter === "ALL" || r.packageType === packageTypeFilter;

    return matchesSearch && matchesStatus && matchesWarehouse && matchesPackageType;
  });

  const columns: ColumnDef<InventoryRecord>[] = [
    {
      key: "inventoryCode",
      header: "Inventory / Package ID",
      cell: (item) => (
        <div>
          <Link
            href={`/inventory/${item.id}`}
            className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline block"
          >
            {item.inventoryCode}
          </Link>
          <span className="text-[11px] font-mono text-slate-400">{item.packageId}</span>
        </div>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      cell: (item) => (
        <div>
          <Link
            href={`/customers/${item.customerId}`}
            className="font-medium text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
          >
            {item.customerName}
          </Link>
          <span className="text-[11px] text-slate-400 block font-mono">{item.allocationCode}</span>
        </div>
      ),
    },
    {
      key: "warehouseName",
      header: "Warehouse Facility",
      cell: (item) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
          {item.warehouseName}
        </span>
      ),
    },
    {
      key: "locationPath",
      header: "Storage Location",
      cell: (item) => (
        <span className="text-xs font-mono text-slate-600 dark:text-slate-400 truncate max-w-[200px] block" title={item.locationPath}>
          {item.locationPath}
        </span>
      ),
    },
    {
      key: "packageType",
      header: "Package Type",
      cell: (item) => (
        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-semibold text-[11px] uppercase">
          {item.packageType}
        </span>
      ),
    },
    {
      key: "itemCount",
      header: "Item Quantity",
      cell: (item) => {
        const remaining = item.itemCount - (item.releasedItemCount || 0);
        return (
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-xs">
              {remaining} / {item.itemCount} <span className="text-[10px] text-slate-400 font-normal">stored</span>
            </span>
            <span className="text-[10px] text-slate-400 block">{formatSqFt(item.capacityFootprintSqFt)}</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "createdAt",
      header: "Date Stored",
      cell: (item) => (
        <span className="text-xs text-slate-500">
          {formatDate(item.storedAt || item.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Link
            href={`/inventory/${item.id}`}
            className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            title="View Detail"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <button
            onClick={() => {
              setOutInventoryId(item.id);
              setOutQuantity(1);
              setShowItemsOutModal(true);
            }}
            disabled={item.status === "RELEASED"}
            className="p-1.5 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
            title="Record Items Out"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <LoadingState message="Fetching MoveIt physical inventory records..." className="py-24" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Inventory Service Error"
        message={error}
        onRetry={() => window.location.reload()}
        className="my-12"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Physical Inventory & Storage Records"
        description="Manage stored customer packages, items, quantities, location footprints, and movement history."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/inventory/movements")}
              className="gap-1.5 text-xs"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span>Movement Log</span>
            </Button>
            {(can("INVENTORY", "RELEASE") || can("INVENTORY", "EDIT")) && (
<Button
              variant="outline"
              size="sm"
              onClick={() => setShowItemsOutModal(true)}
              className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Record Items Out</span>
            </Button>
)}
            {can("INVENTORY", "CREATE") && (
<Button
              variant="primary"
              size="sm"
              onClick={() => setShowItemsInModal(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              <span>Record Items In</span>
            </Button>
)}
          </div>
        }
      />

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Records"
          value={summary?.totalRecords || 0}
          subtitle="Inventory Units"
          icon={<Boxes className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          title="Total Packages"
          value={summary?.totalPackages || 0}
          subtitle="Containers & Crates"
          icon={<Package className="h-5 w-5 text-purple-600" />}
        />
        <MetricCard
          title="Items Stored"
          value={summary?.itemsCurrentlyStored || 0}
          subtitle="Active Stored Items"
          icon={<Layers className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Items In Today"
          value={summary?.itemsInToday || 0}
          subtitle="Received Today"
          icon={<ArrowDownRight className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Items Out Today"
          value={summary?.itemsOutToday || 0}
          subtitle="Released Today"
          icon={<ArrowUpRight className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          title="Occupied Footprint"
          value={formatSqFt(summary?.totalOccupiedFootprintSqFt || 0)}
          subtitle="Physical Space Used"
          icon={<Truck className="h-5 w-5 text-indigo-600" />}
        />
      </div>

      {/* Controls & Search / Filtering Bar */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, Package, Customer, Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "IN_STORAGE", label: "In Storage" },
                { value: "PARTIALLY_RELEASED", label: "Partially Released" },
                { value: "RELEASED", label: "Released" },
                { value: "EXPECTED", label: "Expected" },
                { value: "RECEIVED", label: "Received" },
                { value: "DAMAGED", label: "Damaged" },
                { value: "LOST", label: "Lost" },
              ]}
              className="text-xs"
            />

            <Select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Warehouses" },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
              className="text-xs"
            />

            <Select
              value={packageTypeFilter}
              onChange={(e) => setPackageTypeFilter(e.target.value)}
              options={[
                { value: "ALL", label: "All Package Types" },
                { value: "CRATE", label: "Crate" },
                { value: "PALLET", label: "Pallet" },
                { value: "BOX", label: "Box" },
                { value: "CONTAINER", label: "Container" },
                { value: "LOOSE", label: "Loose" },
              ]}
              className="text-xs"
            />
          </div>

        </div>
      </div>

      {/* Main DataTable */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          searchableKey="description"
        />
      </div>

      {/* Record Items In Modal */}
      {showItemsInModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordItemsIn}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Items In (Physical Storage Intake)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Intake customer package inventory into allocated capacity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemsInModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inErrorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="font-semibold">{inErrorMsg}</div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              {/* Select Customer */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  1. Select Customer *
                </label>
                <select
                  value={inCustomerId}
                  onChange={(e) => {
                    setInCustomerId(e.target.value);
                    setInAllocationId("");
                  }}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* Select Active Allocation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  2. Select Active Allocation *
                </label>
                <select
                  value={inAllocationId}
                  onChange={(e) => {
                    const allocId = e.target.value;
                    setInAllocationId(allocId);
                    const allocObj = allocations.find((a) => a.id === allocId);
                    if (allocObj) {
                      setInWarehouseId(allocObj.warehouseId);
                      setInLocationId(allocObj.locationId);
                    }
                  }}
                  required
                  disabled={!inCustomerId}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">-- Choose Allocation --</option>
                  {activeCustomerAllocations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.allocationCode} — {a.warehouseName} ({a.allocatedCapacity} SQ_FT)
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Warehouse */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  3. Destination Warehouse *
                </label>
                <select
                  value={inWarehouseId}
                  onChange={(e) => setInWarehouseId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Location */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  4. Location Slot *
                </label>
                <select
                  value={inLocationId}
                  onChange={(e) => setInLocationId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Location Slot --</option>
                  {availableSlots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                  {availableSlots.length === 0 && (
                    <option value="slot-default">Assigned Allocation Location Slot</option>
                  )}
                </select>
              </div>

              {/* Package Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Package Container Type *
                </label>
                <select
                  value={inPackageType}
                  onChange={(e) => setInPackageType(e.target.value as PackageType)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="CRATE">Crate</option>
                  <option value="PALLET">Pallet</option>
                  <option value="BOX">Box</option>
                  <option value="CONTAINER">Container</option>
                  <option value="LOOSE">Loose</option>
                </select>
              </div>

              {/* Item Count */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Total Item Count *
                </label>
                <input
                  type="number"
                  min="1"
                  value={inItemCount}
                  onChange={(e) => setInItemCount(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Footprint SQ_FT */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Physical Storage Footprint (SQ_FT) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={inFootprint}
                  onChange={(e) => setInFootprint(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Package Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Executive Furniture Set / Glassware Crates"
                  value={inDescription}
                  onChange={(e) => setInDescription(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowItemsInModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inActionLoading}
                className="inline-flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50"
              >
                {inActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Items In</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Items Out Modal */}
      {showItemsOutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordItemsOut}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-950/50 text-amber-600 rounded-lg">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Items Out (Dispatch / Release)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Release stored package items back to customer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowItemsOutModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {outErrorMsg && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="font-semibold">{outErrorMsg}</div>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Stored Inventory Unit *
                </label>
                <select
                  value={outInventoryId}
                  onChange={(e) => setOutInventoryId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Choose Inventory Record --</option>
                  {records.filter((r) => r.status !== "RELEASED").map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.inventoryCode} — {r.customerName} ({r.itemCount - (r.releasedItemCount || 0)} items remaining)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Release Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  value={outQuantity}
                  onChange={(e) => setOutQuantity(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Release Reason / Dispatch Note *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Client site delivery / Partial release request"
                  value={outReason}
                  onChange={(e) => setOutReason(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowItemsOutModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={outActionLoading || !outInventoryId}
                className="inline-flex items-center space-x-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50"
              >
                {outActionLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Items Out</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
