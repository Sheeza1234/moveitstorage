"use client";

import { useCan } from "@/lib/use-can";
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { services } from "@/services";
import { 
  InventoryRecord, 
  InventoryRecordStatus,
  MovementRecord, 
  Warehouse 
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { formatSqFt, formatDate } from "@/lib/utils";
import { 
  ArrowLeft, 
  ArrowDownRight,
  Package, 
  User, 
  Building2, 
  MapPin, 
  Clock, 
  ArrowUpRight, 
  ArrowLeftRight, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  X,
  FileText,
  Layers
} from "lucide-react";

export default function InventoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const can = useCan();
  const resolvedParams = use(params);
  const inventoryId = resolvedParams.id;

  const [record, setRecord] = useState<InventoryRecord | null>(null);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Items Out Modal State
  const [showItemsOutModal, setShowItemsOutModal] = useState(false);
  const [outQuantity, setOutQuantity] = useState<number>(1);
  const [outReason, setOutReason] = useState("");
  const [outActionLoading, setOutActionLoading] = useState(false);
  const [outModalError, setOutModalError] = useState<string | null>(null);

  // Move Location Modal State
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [destWarehouseId, setDestWarehouseId] = useState("");
  const [destLocationId, setDestLocationId] = useState("");
  const [moveReason, setMoveReason] = useState("");
  const [moveActionLoading, setMoveActionLoading] = useState(false);
  const [moveModalError, setMoveModalError] = useState<string | null>(null);

  // Status Lifecycle Modal State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>("STORED");
  const [statusReason, setStatusReason] = useState("");
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const rec = await services.inventoryService.getInventoryById(inventoryId);
        if (!active) return;
        if (!rec) {
          setRecord(null);
          setLoading(false);
          return;
        }

        setRecord(rec);

        const [movs, whs] = await Promise.all([
          services.movementService.getInventoryMovements(rec.id),
          services.warehouseService.getWarehouses(),
        ]);

        if (active) {
          setMovements(movs);
          setWarehouses(whs);
        }
      } catch (err: unknown) {
        if (active) setErrorMsg((err as Error).message || "Failed to load inventory details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    init();

    return () => {
      active = false;
    };
  }, [inventoryId]);

  // Derived available slots for destination warehouse in move modal
  const selectedDestWarehouse = warehouses.find((w) => w.id === destWarehouseId);
  const destAvailableSlots: { id: string; label: string }[] = [];
  if (selectedDestWarehouse) {
    if (selectedDestWarehouse.floors) {
      for (const fl of selectedDestWarehouse.floors) {
        for (const zn of fl.zones) {
          if (zn.racks) {
            for (const rk of zn.racks) {
              for (const sl of rk.slots) {
                destAvailableSlots.push({
                  id: sl.id,
                  label: `${fl.name} > ${zn.name} > ${rk.name} > ${sl.name} (${sl.availableCapacitySqFt} SQ_FT avail)`,
                });
              }
            }
          }
          if (zn.directSlots) {
            for (const sl of zn.directSlots) {
              destAvailableSlots.push({
                id: sl.id,
                label: `${fl.name} > ${zn.name} > ${sl.name} (${sl.availableCapacitySqFt} SQ_FT avail)`,
              });
            }
          }
        }
      }
    }
  }

  const handleRecordItemsOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setOutActionLoading(true);
    setOutModalError(null);
    setSuccessMsg(null);

    try {
      const updated = await services.inventoryService.recordItemsOut({
        inventoryId: record.id,
        releaseQuantity: outQuantity,
        reason: outReason || "Customer dispatch release",
      });

      setRecord(updated);
      setShowItemsOutModal(false);
      setSuccessMsg(`Successfully released ${outQuantity} items from inventory.`);
      
      const movs = await services.movementService.getInventoryMovements(record.id);
      setMovements(movs);
    } catch (err: unknown) {
      setOutModalError((err as Error).message || "Failed to release items.");
    } finally {
      setOutActionLoading(false);
    }
  };

  const handleMoveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setMoveActionLoading(true);
    setMoveModalError(null);
    setSuccessMsg(null);

    try {
      if (!destWarehouseId || !destLocationId) {
        throw new Error("Please select destination warehouse and location slot.");
      }

      const updated = await services.inventoryService.moveInventory({
        inventoryId: record.id,
        toWarehouseId: destWarehouseId,
        toLocationId: destLocationId,
        reason: moveReason || "Internal warehouse relocation",
      });

      setRecord(updated);
      setShowMoveModal(false);
      setSuccessMsg(`Inventory successfully moved to ${updated.locationPath}`);

      const movs = await services.movementService.getInventoryMovements(record.id);
      setMovements(movs);
    } catch (err: unknown) {
      setMoveModalError((err as Error).message || "Failed to move inventory.");
    } finally {
      setMoveActionLoading(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    setStatusActionLoading(true);
    setStatusModalError(null);
    setSuccessMsg(null);

    try {
      const updated = await services.inventoryService.updateInventoryStatus({
        inventoryId: record.id,
        newStatus: targetStatus as InventoryRecordStatus,
        reason: statusReason || `Lifecycle status update to ${targetStatus}`,
      });

      setRecord(updated);
      setShowStatusModal(false);
      setSuccessMsg(`Inventory lifecycle status transitioned to '${updated.status}'`);

      const movs = await services.movementService.getInventoryMovements(record.id);
      setMovements(movs);
    } catch (err: unknown) {
      setStatusModalError((err as Error).message || "Failed to update lifecycle status.");
    } finally {
      setStatusActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Fetching inventory 360 record details..." className="py-24" />;
  }

  if (!record) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4 py-16">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inventory Record Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400">
          The requested inventory or package ID does not exist in MoveIt storage records.
        </p>
        <Link
          href="/inventory"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-moveit-orange hover:bg-moveit-orange-dark text-white rounded-lg font-medium text-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory Directory</span>
        </Link>
      </div>
    );
  }

  const remainingItems = record.itemCount - (record.releasedItemCount || 0);

  return (
    <div className="space-y-6">
      {/* Navigation & Page Header */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Inventory Directory</span>
        </Link>

        <PageHeader
          title={record.inventoryCode}
          description={`Physical Package Unit: ${record.packageId} • ${record.description}`}
          actions={
            <div className="flex items-center gap-2">
              {can("INVENTORY", "EDIT") && (
<Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDestWarehouseId(record.warehouseId);
                  setShowMoveModal(true);
                }}
                disabled={record.status === "RELEASED"}
                className="gap-1.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-30"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span>Move Location</span>
              </Button>
)}
              {(can("INVENTORY", "RELEASE") || can("INVENTORY", "EDIT")) && (
<Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setOutQuantity(1);
                  setShowItemsOutModal(true);
                }}
                disabled={record.status === "RELEASED"}
                className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-30"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>Record Items Out</span>
              </Button>
)}
            </div>
          }
        />
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-200 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">{successMsg}</div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Overview & Packing List Items */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Package Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Stored Package Snapshot</h3>
                  <p className="text-xs text-slate-500 font-mono">Package Code: {record.packageId}</p>
                </div>
              </div>
              <StatusBadge status={record.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Item Quantity</span>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {remainingItems} / {record.itemCount} <span className="text-xs font-normal text-slate-500">remaining</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Physical Footprint</span>
                <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {formatSqFt(record.capacityFootprintSqFt)}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Package Type</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 uppercase">
                  {record.packageType}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Capacity Unit</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {record.capacityUnit}
                </p>
              </div>
            </div>

            {/* Relationship Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Customer Account</span>
                  <Link
                    href={`/customers/${record.customerId}`}
                    className="font-bold text-blue-600 dark:hover:text-blue-400 hover:underline"
                  >
                    {record.customerName}
                  </Link>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Linked Allocation</span>
                  <Link
                    href={`/allocations/${record.allocationId}`}
                    className="font-bold text-blue-600 dark:hover:text-blue-400 hover:underline font-mono"
                  >
                    {record.allocationCode}
                  </Link>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Warehouse Facility</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{record.warehouseName}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Current Storage Location</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white text-[11px]">{record.locationPath}</span>
                </div>
              </div>
            </div>

            {record.notes && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">Special Handling & Operations Notes:</span>
                <p className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                  {record.notes}
                </p>
              </div>
            )}
          </div>

          {/* Packing List Item Details Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Packing List Item Breakdown</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">
                Packing List ID: {record.packingListId || "PL-2026-DEFAULT"}
              </span>
            </h3>

            {(!record.items || record.items.length === 0) ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No itemized breakdown defined for this package unit. Main description: &quot;{record.description}&quot;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="pb-2">Item Name</th>
                      <th className="pb-2">Quantity</th>
                      <th className="pb-2">Handling Attributes</th>
                      <th className="pb-2">Special Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {record.items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2.5 font-bold text-slate-900 dark:text-white">{it.name}</td>
                        <td className="py-2.5 font-semibold text-slate-700 dark:text-slate-300">{it.quantity} units</td>
                        <td className="py-2.5">
                          <div className="flex items-center space-x-1.5">
                            {it.fragile && (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded font-bold text-[9px]">
                                FRAGILE
                              </span>
                            )}
                            {it.heavy && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded font-bold text-[9px]">
                                HEAVY
                              </span>
                            )}
                            {!it.fragile && !it.heavy && (
                              <span className="text-slate-400 text-[11px]">Standard</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-500 text-[11px]">{it.specialHandling || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Timeline & Movement Logs */}
        <div className="space-y-6">
          
          {/* Quick Action Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4 text-xs">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Inventory Controls
            </h3>

            <div className="space-y-2">
              {(can("INVENTORY", "RELEASE") || can("INVENTORY", "EDIT")) && (
<button
                onClick={() => {
                  setOutQuantity(1);
                  setShowItemsOutModal(true);
                }}
                disabled={record.status === "RELEASED"}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Record Items Out (Release)</span>
              </button>
)}

              {can("INVENTORY", "EDIT") && (
<button
                onClick={() => {
                  setDestWarehouseId(record.warehouseId);
                  setShowMoveModal(true);
                }}
                disabled={record.status === "RELEASED"}
                className="w-full py-2.5 bg-moveit-orange hover:bg-moveit-orange-dark text-white font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Relocate Storage Location</span>
              </button>
)}

              {can("INVENTORY", "EDIT") && (
<button
                onClick={() => {
                  setTargetStatus(record.status === "EXPECTED" ? "RECEIVED" : record.status === "RECEIVED" ? "STORED" : "RELEASED");
                  setShowStatusModal(true);
                }}
                disabled={record.status === "RELEASED"}
                className="w-full py-2.5 bg-moveit-orange hover:bg-moveit-orange-dark text-white font-semibold rounded-lg shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Update Lifecycle Status</span>
              </button>
)}
            </div>
          </div>

          {/* Movement Audit Trail Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Movement History Timeline</span>
            </h3>

            {movements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No movements recorded yet.</p>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 text-xs">
                {movements.map((m) => (
                  <div key={m.id} className="flex items-start space-x-3 relative">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 z-10">
                      {m.movementType === "IN" ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600" />
                      ) : m.movementType === "OUT" ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {m.movementType === "IN" ? "Physical Intake (IN)" : m.movementType === "OUT" ? "Customer Release (OUT)" : "Internal Relocation"}
                      </p>
                      <p className="text-slate-500 mt-0.5">{m.reason}</p>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        {formatDate(m.timestamp)} • Performed by {m.performedBy}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Record Items Out Modal Dialog */}
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
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Items Out</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Release package items from storage</p>
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

            {outModalError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold">
                {outModalError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-slate-500 block">Package ID: {record.packageId}</span>
                <span className="font-bold text-slate-900 dark:text-white">Currently Stored: {remainingItems} items</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Release Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  max={remainingItems}
                  value={outQuantity}
                  onChange={(e) => setOutQuantity(parseInt(e.target.value, 10) || 1)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Release *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled customer delivery dispatch"
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
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={outActionLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {outActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Release</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Relocate Storage Location Modal Dialog */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleMoveInventory}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/50 text-blue-600 rounded-lg">
                  <ArrowLeftRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Internal Warehouse Movement</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Relocate physical package to new storage location</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {moveModalError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold">
                {moveModalError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
                <span className="text-slate-500 block">Current Location:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{record.locationPath}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Warehouse *
                </label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Location Slot *
                </label>
                <select
                  value={destLocationId}
                  onChange={(e) => setDestLocationId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- Select Destination Slot --</option>
                  {destAvailableSlots.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                  {destAvailableSlots.length === 0 && (
                    <option value="slot-dest-default">Target Transferred Storage Zone</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Relocation Reason *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Re-allocated for warehouse space optimization"
                  value={moveReason}
                  onChange={(e) => setMoveReason(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={moveActionLoading}
                className="px-5 py-2 bg-moveit-orange hover:bg-moveit-orange-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {moveActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Relocation</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Update Inventory Lifecycle Status Modal Dialog */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateStatus}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/50 text-purple-600 rounded-lg">
                  <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Update Lifecycle Status</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Transition inventory physical operational state</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statusModalError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs font-semibold">
                {statusModalError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Current Lifecycle Status</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">{record.status}</span>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Approved Lifecycle Status *
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="EXPECTED">EXPECTED (Inbound Scheduled / Expected Arrival)</option>
                  <option value="RECEIVED">RECEIVED (Inspected at Receiving Dock)</option>
                  <option value="STORED">STORED (Putaway Completed & Stored in Slot)</option>
                  <option value="MOVED">MOVED (Internal Warehouse / Inter-Facility Relocation)</option>
                  <option value="RELEASED">RELEASED (Outbound Released / Dispatched to Customer)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Transition *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Putaway completed in Slot 101-A per operational checklist"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={statusActionLoading}
                className="px-5 py-2 bg-moveit-orange hover:bg-moveit-orange-dark text-white text-xs font-semibold rounded-lg shadow-xs transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {statusActionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Confirm Status Transition</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
