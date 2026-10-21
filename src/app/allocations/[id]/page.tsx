"use client";

import { useCan } from "@/lib/use-can";
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  User, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Boxes, 
  Clock, 
  Ban, 
  FileText,
  ShieldCheck,
  Zap,
  RefreshCw,
  Check,
  X
} from "lucide-react";
import { services } from "@/services";
import { 
  StorageAllocation, 
  AllocationCandidateLocation, 
  WarehouseSlot
} from "@/types";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { CapacityProgress } from "@/components/ui/capacity-progress";
import { calculateLocationCapacity } from "@/lib/utils/capacity";

export default function AllocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const can = useCan();
  const resolvedParams = use(params);
  const allocationId = resolvedParams.id;

  const [allocation, setAllocation] = useState<StorageAllocation | null>(null);
  const [candidateLocations, setCandidateLocations] = useState<AllocationCandidateLocation[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [locationDetails, setLocationDetails] = useState<WarehouseSlot | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAllocationData() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const alloc = await services.allocationService.getAllocationById(allocationId);
        if (!active) return;

        if (!alloc) {
          setAllocation(null);
          setLoading(false);
          return;
        }

        setAllocation(alloc);

        // Fetch candidate locations for review/confirmation if pending
        if (alloc.status === "PENDING_REVIEW" || alloc.status === "RECOMMENDED" || alloc.status === "DRAFT") {
          const candidates = await services.allocationService.findAvailableLocations({
            customerId: alloc.customerId,
            storageType: alloc.storageType,
            requiredCapacity: alloc.requiredCapacity,
            capacityUnit: alloc.capacityUnit,
            startDate: alloc.startDate,
            expectedEndDate: alloc.expectedEndDate,
            preferredWarehouseId: alloc.warehouseId,
          });
          if (active) {
            setCandidateLocations(candidates);
            if (alloc.locationId) {
              setSelectedCandidateId(alloc.locationId);
            } else if (candidates.length > 0) {
              setSelectedCandidateId(candidates[0].locationId);
            }
          }
        }

        // Fetch physical warehouse location capacity breakdown if assigned
        if (alloc.warehouseId && alloc.locationId) {
          const wh = await services.warehouseService.getWarehouseById(alloc.warehouseId);
          if (active && wh) {
            // Search slot in warehouse hierarchy
            let foundSlot: WarehouseSlot | null = null;
            if (wh.floors) {
              for (const fl of wh.floors) {
                for (const zn of fl.zones) {
                  if (zn.racks) {
                    for (const rk of zn.racks) {
                      const sl = rk.slots.find((s) => s.id === alloc.locationId);
                      if (sl) { foundSlot = sl; break; }
                    }
                  }
                  if (zn.directSlots) {
                    const sl = zn.directSlots.find((s) => s.id === alloc.locationId);
                    if (sl) { foundSlot = sl; break; }
                  }
                }
              }
            }
            if (active && foundSlot) setLocationDetails(foundSlot);
          }
        }
      } catch (err: unknown) {
        if (active) setErrorMsg((err as Error).message || "Failed to load allocation record.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAllocationData();

    return () => {
      active = false;
    };
  }, [allocationId]);

  const handleConfirmAllocation = async () => {
    if (!allocation) return;
    const targetLocationId = selectedCandidateId || allocation.locationId;
    if (!targetLocationId) {
      setErrorMsg("Please select a target warehouse location first.");
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Race condition safety re-check is performed inside services.allocationService.confirmAllocation
      const updated = await services.allocationService.confirmAllocation(allocation.id, targetLocationId);
      setAllocation(updated);
      setSuccessMsg(`Allocation ${updated.allocationCode} successfully CONFIRMED! Capacity reserved.`);
      setShowConfirmModal(false);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Confirmation failed. Live capacity may have changed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseAllocation = async () => {
    if (!allocation) return;
    if (!window.confirm(`Are you sure you want to RELEASE allocation ${allocation.allocationCode}? This will free reserved capacity.`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await services.allocationService.releaseAllocation(allocation.id);
      setAllocation(updated);
      setSuccessMsg(`Allocation ${updated.allocationCode} has been RELEASED.`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to release allocation.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelAllocation = async () => {
    if (!allocation) return;
    if (!window.confirm(`Are you sure you want to CANCEL allocation ${allocation.allocationCode}?`)) {
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const updated = await services.allocationService.cancelAllocation(allocation.id);
      setAllocation(updated);
      setSuccessMsg(`Allocation ${updated.allocationCode} has been CANCELLED.`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to cancel allocation.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center space-x-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading allocation details...</span>
        </div>
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4 py-16">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Allocation Record Not Found</h2>
        <p className="text-slate-500 dark:text-slate-400">
          The requested allocation ID does not exist or may have been removed.
        </p>
        <Link
          href="/allocations"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-moveit-orange hover:bg-moveit-orange-dark text-white rounded-lg font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storage Allocations</span>
        </Link>
      </div>
    );
  }

  const isPending = allocation.status === "PENDING_REVIEW" || allocation.status === "RECOMMENDED" || allocation.status === "DRAFT";
  const isConfirmed = allocation.status === "CONFIRMED" || allocation.status === "ACTIVE";
  const isTerminal = allocation.status === "RELEASED" || allocation.status === "CANCELLED";

  // Compute live capacity info for displaying on detail page
  const totalCapacity = locationDetails?.totalCapacitySqFt || 1000;
  const occupiedCapacity = locationDetails?.occupiedCapacitySqFt || 0;
  const reservedCapacity = locationDetails?.reservedCapacitySqFt || (isConfirmed ? allocation.allocatedCapacity : 0);
  const { availableSqFt } = calculateLocationCapacity(totalCapacity, occupiedCapacity, reservedCapacity, locationDetails?.status || "AVAILABLE");

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div>
        <Link
          href="/allocations"
          className="inline-flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-2 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Allocations Directory</span>
        </Link>

        <PageHeader
          title={allocation.allocationCode}
          description={`Customer Storage Allocation Record for ${allocation.customerName}`}
          actions={
            <div className="flex items-center space-x-3">
              {isPending && (
                can("ALLOCATIONS", "APPROVE") && (
<button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Review & Confirm Allocation</span>
                </button>
)
              )}

              {isConfirmed && (
                can("ALLOCATIONS", "RELEASE") && (
<button
                  onClick={handleReleaseAllocation}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
                >
                  <Zap className="w-4 h-4" />
                  <span>Release Allocation</span>
                </button>
)
              )}

              {!isTerminal && (
                (can("ALLOCATIONS", "EDIT") || can("ALLOCATIONS", "CLOSE")) && (
<button
                  onClick={handleCancelAllocation}
                  disabled={actionLoading}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
                >
                  <Ban className="w-4 h-4" />
                  <span>Cancel Allocation</span>
                </button>
)
              )}
            </div>
          }
        />
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start space-x-3 text-rose-800 dark:text-rose-200 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-200 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Details & Capacity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Overview Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Boxes className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">Storage Requirement Overview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Created on {new Date(allocation.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <StatusBadge status={allocation.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Required Capacity</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {allocation.requiredCapacity.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{allocation.capacityUnit}</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Allocated Capacity</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {allocation.allocatedCapacity.toLocaleString()} <span className="text-xs font-semibold text-slate-500">{allocation.capacityUnit}</span>
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Storage Type</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1 capitalize">
                  {allocation.storageType.replace(/_/g, " ")}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Capacity Unit</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                  {allocation.capacityUnit}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 text-sm">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Customer</span>
                  <Link
                    href={`/customers/${allocation.customerId}`}
                    className="font-medium text-blue-600 dark:hover:text-blue-400 hover:underline"
                  >
                    {allocation.customerName}
                  </Link>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Assigned Warehouse</span>
                  <span className="font-medium text-slate-900 dark:text-white">{allocation.warehouseName}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Storage Location Path</span>
                  <span className="font-medium text-slate-900 dark:text-white font-mono text-xs">{allocation.locationPath}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block">Schedule Term</span>
                  <span className="font-medium text-slate-900 dark:text-white text-xs">
                    {allocation.startDate} to {allocation.expectedEndDate}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Capacity Breakdown Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
              <Boxes className="w-5 h-5 text-slate-500" />
              <span>Location Capacity Breakdown</span>
            </h3>

            <CapacityProgress
              totalSqFt={totalCapacity}
              occupiedSqFt={occupiedCapacity}
              reservedSqFt={reservedCapacity}
              availableSqFt={availableSqFt}
            />

            <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-500 block">Total</span>
                <span className="font-semibold text-slate-900 dark:text-white">{totalCapacity.toLocaleString()} {allocation.capacityUnit}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Occupied</span>
                <span className="font-semibold text-amber-600">{occupiedCapacity.toLocaleString()} {allocation.capacityUnit}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reserved</span>
                <span className="font-semibold text-blue-600">{reservedCapacity.toLocaleString()} {allocation.capacityUnit}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Available</span>
                <span className="font-semibold text-emerald-600">{availableSqFt.toLocaleString()} {allocation.capacityUnit}</span>
              </div>
            </div>
          </div>

          {/* AI Recommendation Analysis Card */}
          {allocation.aiRecommended && (
            <div className="bg-gradient-to-r from-blue-900/5 via-indigo-900/5 to-purple-900/5 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200/80 dark:border-blue-800/60 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-slate-900 dark:text-white">AI Storage Recommendation Analysis</h3>
                </div>
                {allocation.recommendationScore && (
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-full">
                    {allocation.recommendationScore}% Compatibility Match
                  </span>
                )}
              </div>

              <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-lg border border-blue-100 dark:border-blue-900/50 space-y-2">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">Match Rationale & Logic:</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  &quot;{allocation.recommendationReason || "Location has optimal available capacity, matches requested storage type, and minimizes space fragmentation."}&quot;
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>AI Recommendation verified. Over-allocation protection active. Final allocation requires explicit admin confirmation.</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Column - Status & Activity Timeline */}
        <div className="space-y-6">
          
          {/* Status & Confirmation Action Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Allocation Status & Action
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Current Status</span>
                <StatusBadge status={allocation.status} />
              </div>

              {allocation.confirmedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Confirmed At</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {new Date(allocation.confirmedAt).toLocaleDateString()} {new Date(allocation.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}

              {allocation.releasedAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Released At</span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {new Date(allocation.releasedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {isPending && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">Action Required:</span> Review recommended location and confirm to reserve capacity.
                </div>
                {can("ALLOCATIONS", "APPROVE") && (
<button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Review & Confirm Allocation</span>
                </button>
)}
              </div>
            )}
          </div>

          {/* Activity Event Log Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Allocation Activity History</span>
            </h3>

            <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 text-xs">
              
              {/* Event 1: Requirement Created */}
              <div className="flex items-start space-x-3 relative">
                <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 z-10">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Storage Requirement Created</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {new Date(allocation.createdAt).toLocaleDateString()} {new Date(allocation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Event 2: AI Recommendation Generated */}
              {allocation.aiRecommended && (
                <div className="flex items-start space-x-3 relative">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 z-10">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">AI Recommendation Evaluated</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Location scored {allocation.recommendationScore || 95}% match
                    </p>
                  </div>
                </div>
              )}

              {/* Event 3: Confirmed / Released / Cancelled */}
              {allocation.confirmedAt && (
                <div className="flex items-start space-x-3 relative">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 z-10">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Admin Allocation Confirmed</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(allocation.confirmedAt).toLocaleDateString()} {new Date(allocation.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}

              {allocation.releasedAt && (
                <div className="flex items-start space-x-3 relative">
                  <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 z-10">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Allocation Released</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {new Date(allocation.releasedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {allocation.status === "CANCELLED" && (
                <div className="flex items-start space-x-3 relative">
                  <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 z-10">
                    <Ban className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Allocation Cancelled</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                      Cancelled by Administrator
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal / Admin Review Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review & Confirm Storage Allocation</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Admin verification and live capacity validation</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{allocation.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Capacity:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{allocation.requiredCapacity} {allocation.capacityUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Storage Type:</span>
                  <span className="font-semibold text-slate-900 dark:text-white capitalize">{allocation.storageType.replace(/_/g, " ")}</span>
                </div>
              </div>

              {/* Candidate Location Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Destination Location Slot
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {candidateLocations.map((loc) => {
                    const isSelected = selectedCandidateId === loc.locationId;
                    return (
                      <div
                        key={loc.locationId}
                        onClick={() => setSelectedCandidateId(loc.locationId)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                            <span>{loc.locationName}</span>
                            <span className="font-mono text-slate-400">({loc.locationCode})</span>
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-semibold text-[10px]">
                              {loc.compatibilityScore}% Match
                            </span>
                          </div>
                          <p className="text-slate-500 text-[11px] mt-0.5">{loc.locationPath}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-emerald-600 block">{loc.availableCapacity} {loc.capacityUnit} Available</span>
                          <span className="text-[10px] text-slate-400">Total: {loc.totalCapacity} {loc.capacityUnit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  Confirming this allocation will validate live location capacity in real-time and transition the space to <strong>RESERVED</strong> capacity.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAllocation}
                disabled={actionLoading || !selectedCandidateId}
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm & Reserve Capacity</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
