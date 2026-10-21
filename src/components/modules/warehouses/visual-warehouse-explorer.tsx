"use client";

import * as React from "react";
import { Warehouse, Floor, Zone, Rack, WarehouseSlot } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CapacityProgress } from "@/components/ui/capacity-progress";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { formatSqFt } from "@/lib/utils";
import { MOCK_PACKAGES } from "@/services/mock/mock-db";
import { 
  Building2, 
  Layers, 
  Grid3X3, 
  Package, 
  ChevronRight, 
  ArrowLeft,
  Maximize2,
  Box
} from "lucide-react";

export interface VisualWarehouseExplorerProps {
  warehouse: Warehouse;
}

export function VisualWarehouseExplorer({ warehouse }: VisualWarehouseExplorerProps) {
  // Reset navigation when warehouse ID changes via state key pattern
  const [prevWarehouseId, setPrevWarehouseId] = React.useState(warehouse.id);
  const [selectedFloor, setSelectedFloor] = React.useState<Floor | null>(null);
  const [selectedZone, setSelectedZone] = React.useState<Zone | null>(null);
  const [selectedRack, setSelectedRack] = React.useState<Rack | null>(null);

  if (warehouse.id !== prevWarehouseId) {
    setPrevWarehouseId(warehouse.id);
    setSelectedFloor(null);
    setSelectedZone(null);
    setSelectedRack(null);
  }

  // Selected item detail drawer
  const [activeSlot, setActiveSlot] = React.useState<{
    slot: WarehouseSlot;
    parentPath: string;
  } | null>(null);

  const hasFloors = Boolean(warehouse.floors && warehouse.floors.length > 0);
  const hasDirectZones = Boolean(warehouse.directZones && warehouse.directZones.length > 0);

  // Breadcrumb path inside visual explorer
  const explorerBreadcrumbs = React.useMemo(() => {
    const list = [{ label: warehouse.code, onClick: () => { setSelectedFloor(null); setSelectedZone(null); setSelectedRack(null); } }];
    if (selectedFloor) {
      list.push({ label: selectedFloor.name, onClick: () => { setSelectedZone(null); setSelectedRack(null); } });
    }
    if (selectedZone) {
      list.push({ label: selectedZone.name, onClick: () => { setSelectedRack(null); } });
    }
    if (selectedRack) {
      list.push({ label: selectedRack.name, onClick: () => {} });
    }
    return list;
  }, [warehouse, selectedFloor, selectedZone, selectedRack]);

  // Packages assigned to selected slot
  const slotPackages = React.useMemo(() => {
    if (!activeSlot) return [];
    return MOCK_PACKAGES.filter((p) => p.slotId === activeSlot.slot.id);
  }, [activeSlot]);

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Visual Warehouse Hierarchy Explorer
            </CardTitle>
            <CardDescription>
              Interactive spatial navigation — click on floors, zones, or racks to inspect slot statuses
            </CardDescription>
          </div>

          {/* Location Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium bg-slate-50 p-2 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Status Legend:</span>
            <StatusBadge status="AVAILABLE" size="sm" />
            <StatusBadge status="PARTIALLY_OCCUPIED" size="sm" />
            <StatusBadge status="OCCUPIED" size="sm" />
            <StatusBadge status="RESERVED" size="sm" />
            <StatusBadge status="BLOCKED" size="sm" />
          </div>
        </div>

        {/* Explorer Breadcrumb Navigation Trail */}
        <div className="flex items-center gap-1.5 pt-3 text-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedFloor(null); setSelectedZone(null); setSelectedRack(null); }}
            className="h-7 px-2 text-xs"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600 mr-1" />
            Root Facility
          </Button>

          {explorerBreadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <button
                onClick={crumb.onClick}
                className="font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 transition-colors"
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* LEVEL 1: FLOORS (If warehouse has floor levels) */}
        {!selectedFloor && !selectedZone && !selectedRack && hasFloors && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Warehouse Floors ({warehouse.floors?.length || 0})
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {warehouse.floors?.map((floor) => {
                const total = floor.totalCapacitySqFt || 1000;
                const occupied = floor.occupiedSqFt || 0;
                const reserved = floor.reservedSqFt || 0;
                const { availableSqFt, utilizationPercentage } = calculateLocationCapacity(total, occupied, reserved);

                return (
                  <div
                    key={floor.id}
                    onClick={() => setSelectedFloor(floor)}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 font-bold text-xs">
                          <Layers className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {floor.name}
                          </h5>
                          <span className="text-[10px] text-slate-400">{floor.code} • {floor.zones?.length || 0} Zones</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                    </div>

                    <CapacityProgress
                      totalSqFt={total}
                      occupiedSqFt={occupied}
                      reservedSqFt={reserved}
                      availableSqFt={availableSqFt}
                      size="sm"
                      showLegend={false}
                    />

                    <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2">
                      <span>Occupancy: {utilizationPercentage}%</span>
                      <span className="text-blue-600 font-semibold">Explore Zones →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 2: ZONES (Either under selected Floor OR Direct Warehouse Zones) */}
        {((selectedFloor && !selectedZone) || (!hasFloors && hasDirectZones && !selectedZone)) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Storage Zones ({selectedFloor ? selectedFloor.zones.length : warehouse.directZones?.length || 0})
              </h4>
              {selectedFloor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFloor(null)}
                  className="text-xs gap-1"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Floors
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(selectedFloor ? selectedFloor.zones : warehouse.directZones || []).map((zone) => {
                const isDirectOpenFloor = Boolean(zone.isOpenFloor || (zone.directSlots && zone.directSlots.length > 0));
                const total = zone.totalCapacitySqFt || 2000;
                const occupied = zone.occupiedSqFt || 0;
                const reserved = zone.reservedSqFt || 0;
                const { availableSqFt, computedStatus } = calculateLocationCapacity(total, occupied, reserved, zone.status);

                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZone(zone)}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold text-xs">
                          <Box className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                            {zone.name}
                          </h5>
                          <span className="text-[10px] text-slate-400">
                            {isDirectOpenFloor ? "Open Floor Bay Storage" : `${zone.racks?.length || 0} Storage Racks`}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={computedStatus || "AVAILABLE"} size="sm" />
                    </div>

                    <CapacityProgress
                      totalSqFt={total}
                      occupiedSqFt={occupied}
                      reservedSqFt={reserved}
                      availableSqFt={availableSqFt}
                      size="sm"
                      showLegend={false}
                    />

                    <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span>{isDirectOpenFloor ? "Direct Floor Slots" : "View Racks"}</span>
                      <span className="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Inspect Zone <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 3: RACKS OR DIRECT OPEN FLOOR SLOTS (Under Selected Zone) */}
        {selectedZone && !selectedRack && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedZone.name} Configuration
                </h4>
                <p className="text-[11px] text-slate-500">
                  {selectedZone.isOpenFloor
                    ? "Open floor bay storage layout"
                    : "Rack & shelf grid layout"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedZone(null)}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Zones
              </Button>
            </div>

            {/* OPEN FLOOR BAY SLOTS DISPLAY */}
            {selectedZone.isOpenFloor || (selectedZone.directSlots && selectedZone.directSlots.length > 0) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {selectedZone.directSlots?.map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() =>
                      setActiveSlot({
                        slot,
                        parentPath: `${warehouse.name} > ${selectedFloor?.name || ""} > ${selectedZone.name}`,
                      })
                    }
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Open Floor Bay
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {slot.name}
                        </h5>
                        <span className="text-[10px] font-mono text-slate-500">{slot.code}</span>
                      </div>
                      <StatusBadge status={slot.status} size="sm" />
                    </div>

                    <CapacityProgress
                      totalSqFt={slot.totalCapacitySqFt}
                      occupiedSqFt={slot.occupiedCapacitySqFt}
                      reservedSqFt={slot.reservedCapacitySqFt}
                      availableSqFt={slot.availableCapacitySqFt}
                      size="sm"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-2">
                      <span>Click to view details</span>
                      <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* RACK GRID DISPLAY */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                {selectedZone.racks?.map((rack) => {
                  const total = rack.totalCapacitySqFt || 750;
                  const occupied = rack.occupiedSqFt || 0;
                  const reserved = rack.reservedSqFt || 0;
                  const { availableSqFt, computedStatus } = calculateLocationCapacity(total, occupied, reserved, rack.status);

                  return (
                    <div
                      key={rack.id}
                      onClick={() => setSelectedRack(rack)}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer group space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 font-bold text-xs">
                            <Grid3X3 className="h-4 w-4" />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                              {rack.name}
                            </h5>
                            <span className="text-[10px] text-slate-400">{rack.code} • {rack.slots.length} Slots</span>
                          </div>
                        </div>
                        <StatusBadge status={computedStatus || "AVAILABLE"} size="sm" />
                      </div>

                      <CapacityProgress
                        totalSqFt={total}
                        occupiedSqFt={occupied}
                        reservedSqFt={reserved}
                        availableSqFt={availableSqFt}
                        size="sm"
                        showLegend={false}
                      />

                      <div className="flex items-center justify-between text-[11px] text-blue-600 font-semibold pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>Inspect Rack Slots</span>
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 4: SLOTS (Inside Selected Rack) */}
        {selectedRack && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {selectedRack.name} Slot Distribution
                </h4>
                <p className="text-[11px] text-slate-500">
                  Individual rack slots and color-coded location status
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRack(null)}
                className="text-xs gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Racks
              </Button>
            </div>

            {/* SLOTS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {selectedRack.slots.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() =>
                    setActiveSlot({
                      slot,
                      parentPath: `${warehouse.name} > ${selectedFloor?.name || ""} > ${selectedZone?.name || ""} > ${selectedRack.name}`,
                    })
                  }
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {slot.name}
                      </h5>
                      <span className="text-[10px] font-mono text-slate-500">{slot.code}</span>
                    </div>
                    <StatusBadge status={slot.status} size="sm" />
                  </div>

                  <CapacityProgress
                    totalSqFt={slot.totalCapacitySqFt}
                    occupiedSqFt={slot.occupiedCapacitySqFt}
                    reservedSqFt={slot.reservedCapacitySqFt}
                    availableSqFt={slot.availableCapacitySqFt}
                    size="sm"
                  />

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-2">
                    <span>Type: <strong>{slot.storageType}</strong></span>
                    <Maximize2 className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* STORAGE LOCATION DETAIL DRAWER */}
      {activeSlot && (
        <Drawer
          isOpen={Boolean(activeSlot)}
          onClose={() => setActiveSlot(null)}
          title={`Location Detail — ${activeSlot.slot.name}`}
          description={activeSlot.parentPath}
          size="lg"
        >
          <div className="space-y-6">
            {/* Status & Code Bar */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Location Code
                </span>
                <p className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                  {activeSlot.slot.code}
                </p>
              </div>
              <StatusBadge status={activeSlot.slot.status} size="md" />
            </div>

            {/* Capacity Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Capacity Statistics
              </h4>
              <CapacityProgress
                totalSqFt={activeSlot.slot.totalCapacitySqFt}
                occupiedSqFt={activeSlot.slot.occupiedCapacitySqFt}
                reservedSqFt={activeSlot.slot.reservedCapacitySqFt}
                availableSqFt={activeSlot.slot.availableCapacitySqFt}
                size="lg"
              />
            </div>

            {/* Storage Attributes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Storage Model Type
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {activeSlot.slot.storageType}
                </p>
              </div>

              <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">
                  Available Sq Footage
                </span>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatSqFt(activeSlot.slot.availableCapacitySqFt)}
                </p>
              </div>
            </div>

            {/* Stored Packages List (If mock packages exist) */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Current Stored Items ({slotPackages.length})
              </h4>

              {slotPackages.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-lg">
                  No active packages stored in this specific slot location.
                </div>
              ) : (
                <div className="space-y-2">
                  {slotPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="p-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {pkg.packageId}
                        </span>
                        <p className="text-slate-500 text-[11px]">{pkg.description}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                        {pkg.packageType} x{pkg.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </Card>
  );
}
