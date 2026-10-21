"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, FlaskConical, Layers3, LayoutGrid } from "lucide-react";
import { services } from "@/services";
import { useUIStore } from "@/store/use-ui-store";
import { useWarehouse3DStore } from "@/store/use-warehouse-3d-store";
import { CapacityUnit, InventoryRecord, LocationStatus, StorageAllocation, Warehouse, hasPermission } from "@/types";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { findLocationInWarehouses } from "@/lib/utils/location-resolver";
import { DEMO_LAYOUT_NOTICE, buildDemoLayout } from "@/lib/utils/warehouse-demo-layout";
import {
  WarehouseLayoutConfig,
  WarehouseVisualFilter,
  WarehouseVisualNode,
  buildWarehouseVisualModel,
  computeMatchIds,
  searchNodes,
} from "@/lib/utils/warehouse-visual-adapter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse2DPlan } from "./warehouse-2d-plan";
import { WarehouseCameraControls, WarehouseFilterBar, WarehouseFloorSelector } from "./warehouse-3d-controls";
import { WarehouseCapacitySummary } from "./warehouse-capacity-summary";
import { WarehouseLayoutConfigModal } from "./warehouse-layout-config-modal";
import { WarehouseLocationList } from "./warehouse-location-list";
import { WarehouseLocationPanel } from "./warehouse-location-panel";
import { WarehouseLocationTooltip } from "./warehouse-location-tooltip";
import { WarehouseSceneLabelLayer } from "./warehouse-3d-labels";
import { WarehouseStatusLegend } from "./warehouse-status-legend";

const Warehouse3DScene = dynamic(() => import("./warehouse-3d-scene").then((m) => m.Warehouse3DScene), {
  ssr: false,
  loading: () => <SceneMessage>Loading 3D warehouse…</SceneMessage>,
});

const INACTIVE_INVENTORY = new Set(["RELEASED", "DISPOSED", "LOST"]);
const EMPTY_SET: ReadonlySet<string> = new Set();

function SceneMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-[240px] items-center justify-center text-xs font-medium text-moveit-muted">{children}</div>;
}

let webglSupport: boolean | null = null;
function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    webglSupport = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

const noopSubscribe = () => () => {};
const COMPACT_QUERY = "(max-width: 767px)";
function subscribeCompact(cb: () => void) {
  const mq = window.matchMedia(COMPACT_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

class SceneBoundary extends React.Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export interface Warehouse3DExplorerProps {
  warehouse: Warehouse;
}

export function Warehouse3DExplorer({ warehouse }: Warehouse3DExplorerProps) {
  const role = useUIStore((s) => s.currentRole);
  const theme = useUIStore((s) => s.theme);
  const can = React.useMemo(
    () => ({
      customers: hasPermission(role, "CUSTOMERS", "VIEW"),
      allocations: hasPermission(role, "ALLOCATIONS", "VIEW"),
      inventory: hasPermission(role, "INVENTORY", "VIEW"),
    }),
    [role]
  );
  const canConfigure = hasPermission(role, "WAREHOUSES", "EDIT");

  // Development-only demo overlay (test data). Never available in production builds.
  const demoAvailable = process.env.NODE_ENV !== "production";
  const [demoEnabled, setDemoEnabled] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [storedLayout, setStoredLayout] = React.useState<WarehouseLayoutConfig>({});
  React.useEffect(() => {
    let active = true;
    services.warehouseService
      .getLayoutConfig(warehouse.id)
      .then((cfg) => active && setStoredLayout(cfg))
      .catch(() => active && setStoredLayout({}));
    return () => {
      active = false;
    };
  }, [warehouse.id]);

  const demo = React.useMemo(() => (demoAvailable && demoEnabled ? buildDemoLayout(warehouse) : null), [demoAvailable, demoEnabled, warehouse]);
  const model = React.useMemo(
    () => (demo ? buildWarehouseVisualModel(demo.warehouse, demo.layout) : buildWarehouseVisualModel(warehouse, storedLayout)),
    [demo, warehouse, storedLayout]
  );

  const selectedId = useWarehouse3DStore((s) => s.selectedId);
  const hoveredId = useWarehouse3DStore((s) => s.hoveredId);
  const selectedFloorId = useWarehouse3DStore((s) => s.selectedFloorId);
  const matchIds = useWarehouse3DStore((s) => s.matchIds);
  const store = useWarehouse3DStore;

  const [filter, setFilter] = React.useState<WarehouseVisualFilter>({ query: "", status: "ALL", zoneId: "ALL" });
  const [allocations, setAllocations] = React.useState<StorageAllocation[]>([]);
  const [inventory, setInventory] = React.useState<InventoryRecord[]>([]);
  const [sceneFailed, setSceneFailed] = React.useState(false);
  // null on the server / first paint, then the real answer (no hydration mismatch, no effect + setState)
  const supported = React.useSyncExternalStore<boolean | null>(noopSubscribe, detectWebGL, () => null);
  const webgl = sceneFailed ? false : supported;
  const compact = React.useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_QUERY).matches,
    () => false
  );

  /* ---------- lifecycle ---------- */
  // The page keys this component by warehouse id, so local state resets per warehouse.
  React.useEffect(() => {
    store.getState().reset();
    return () => store.getState().reset();
  }, [warehouse.id, store]);

  /* ---------- existing services: allocations + inventory ---------- */
  React.useEffect(() => {
    let active = true;
    Promise.all([
      can.allocations ? services.allocationService.getAllocations() : Promise.resolve<StorageAllocation[]>([]),
      can.inventory ? services.inventoryService.getInventoryRecords() : Promise.resolve<InventoryRecord[]>([]),
    ])
      .then(([allocs, inv]) => {
        if (!active) return;
        setAllocations(allocs.filter((a) => a.warehouseId === warehouse.id));
        setInventory(inv.filter((r) => r.warehouseId === warehouse.id && !INACTIVE_INVENTORY.has(r.status)));
      })
      .catch(() => {
        if (!active) return;
        setAllocations([]);
        setInventory([]);
      });
    return () => {
      active = false;
    };
  }, [warehouse.id, can.allocations, can.inventory]);

  const allocationsById = React.useMemo(() => new Map(allocations.map((a) => [a.id, a])), [allocations]);
  const inventoryByLocation = React.useMemo(() => {
    const map = new Map<string, InventoryRecord[]>();
    for (const r of inventory) map.set(r.locationId, [...(map.get(r.locationId) ?? []), r]);
    return map;
  }, [inventory]);
  const inventoryLocationIds = React.useMemo<ReadonlySet<string>>(
    () => (inventoryByLocation.size ? new Set(inventoryByLocation.keys()) : EMPTY_SET),
    [inventoryByLocation]
  );

  // The structure can change underneath the view (floor deleted from the portal): fall back to the whole building.
  React.useEffect(() => {
    const st = store.getState();
    if (st.selectedFloorId !== "ALL" && !model.index.has(st.selectedFloorId)) st.setSelectedFloor("ALL");
    if (st.selectedId && !model.index.has(st.selectedId)) st.setSelected(null);
  }, [model, store]);

  /* ---------- filter -> scene ---------- */
  const computedMatches = React.useMemo(() => computeMatchIds(model, filter), [model, filter]);
  React.useEffect(() => {
    store.getState().setMatchIds(computedMatches);
  }, [computedMatches, store]);

  const hits = React.useMemo(() => searchNodes(model, filter.query), [model, filter.query]);

  /* ---------- derived ---------- */
  const selectedNode = selectedId ? model.index.get(selectedId) ?? null : null;
  const hoveredNode = hoveredId ? model.index.get(hoveredId) ?? null : null;

  const selectedAllocation = React.useMemo(() => {
    if (!selectedNode || selectedNode.type !== "slot") return undefined;
    const direct = selectedNode.allocationId ? allocationsById.get(selectedNode.allocationId) : undefined;
    if (direct) return direct;
    return allocations.find(
      (a) => a.locationId === selectedNode.id && (a.status === "ACTIVE" || a.status === "CONFIRMED")
    );
  }, [selectedNode, allocationsById, allocations]);

  const selectedNotes = React.useMemo(() => {
    if (!selectedNode || selectedNode.type !== "slot") return undefined;
    return findLocationInWarehouses([warehouse], selectedNode.id)?.slot.notes;
  }, [selectedNode, warehouse]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<LocationStatus, number> = {
      AVAILABLE: 0,
      PARTIALLY_OCCUPIED: 0,
      OCCUPIED: 0,
      RESERVED: 0,
      BLOCKED: 0,
    };
    for (const s of model.slots) {
      if (selectedFloorId !== "ALL" && s.floorId !== selectedFloorId) continue;
      if (s.status && !s.unlinked) counts[s.status] += 1;
    }
    return counts;
  }, [model, selectedFloorId]);
  const unlinkedCount = React.useMemo(
    () => model.slots.filter((s) => s.unlinked && (selectedFloorId === "ALL" || s.floorId === selectedFloorId)).length,
    [model, selectedFloorId]
  );

  const zoneOptions = React.useMemo(
    () => model.zones.filter((z) => selectedFloorId === "ALL" || z.floorId === selectedFloorId),
    [model, selectedFloorId]
  );

  // Capacity summary follows the selected floor scope; values come from the existing helper/service data.
  const summary = React.useMemo(() => {
    const floor = selectedFloorId !== "ALL" ? model.index.get(selectedFloorId) : undefined;
    if (floor && floor.capacity !== undefined) {
      const c = calculateLocationCapacity(floor.capacity, floor.occupied ?? 0, floor.reserved ?? 0);
      return { scope: floor.name, total: c.totalSqFt, occupied: c.occupiedSqFt, reserved: c.reservedSqFt, available: floor.available ?? c.availableSqFt, utilization: c.utilizationPercentage };
    }
    const c = calculateLocationCapacity(warehouse.totalCapacitySqFt, warehouse.occupiedSqFt, warehouse.reservedSqFt);
    return {
      scope: `${warehouse.name} (entire facility)`,
      total: c.totalSqFt,
      occupied: c.occupiedSqFt,
      reserved: c.reservedSqFt,
      available: warehouse.availableSqFt,
      utilization: warehouse.utilizationPercentage,
    };
  }, [model, selectedFloorId, warehouse]);

  const unit: CapacityUnit = warehouse.capacityUnit;

  /* ---------- actions ---------- */
  const select = React.useCallback(
    (id: string, focus = true) => {
      const node = model.index.get(id);
      if (!node) return;
      const s = store.getState();
      if (node.type === "floor") {
        s.setSelectedFloor(id);
        s.setSelected(id);
        s.sendCamera("focus", id);
        return;
      }
      if (s.selectedFloorId !== "ALL" && node.floorId && node.floorId !== s.selectedFloorId) {
        s.setSelectedFloor(node.floorId);
      }
      s.setSelected(id);
      if (focus) s.sendCamera("focus", id);
    },
    [model, store]
  );

  const selectFloor = (id: string) => {
    const s = store.getState();
    s.setSelectedFloor(id);
    const sel = s.selectedId ? model.index.get(s.selectedId) : undefined;
    if (id !== "ALL") s.setSelected(id); // the panel then shows the floor's own details
    else if (sel?.type === "floor") s.setSelected(null);
    if (id !== "ALL") {
      const zone = filter.zoneId !== "ALL" ? model.index.get(filter.zoneId) : undefined;
      if (zone && zone.floorId !== id) setFilter((f) => ({ ...f, zoneId: "ALL" }));
    }
    s.sendCamera("focus", id === "ALL" ? undefined : id);
  };

  const onZone = (zoneId: string) => {
    setFilter((f) => ({ ...f, zoneId }));
    if (zoneId === "ALL") store.getState().sendCamera("focus", selectedFloorId === "ALL" ? undefined : selectedFloorId);
    else select(zoneId);
  };

  const clearFilters = () => {
    setFilter({ query: "", status: "ALL", zoneId: "ALL" });
    store.getState().sendCamera("focus", selectedFloorId === "ALL" ? undefined : selectedFloorId);
  };

  const pickHit = (node: WarehouseVisualNode) => select(node.id);

  const focusFloorId = selectedFloorId !== "ALL" ? selectedFloorId : selectedNode?.floorId;
  const focusRackId = selectedNode ? (selectedNode.type === "rack" ? selectedNode.id : selectedNode.rackId) : undefined;
  const toggleDemo = () => {
    const s = store.getState();
    s.setSelected(null);
    s.setSelectedFloor("ALL");
    s.sendCamera("reset");
    setFilter({ query: "", status: "ALL", zoneId: "ALL" });
    setDemoEnabled((v) => !v);
  };

  const fallback = webgl === false;
  const filtering = matchIds !== null;

  return (
    <section
      className="space-y-4"
      aria-label={`3D storage explorer for ${warehouse.name}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") store.getState().setSelected(null);
      }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="gap-3 border-b border-moveit-border-soft pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-moveit-orange" />
                3D Warehouse Storage Explorer
              </CardTitle>
              <CardDescription>
                Live storage map of {warehouse.name}: floors, zones, racks and locations rendered from warehouse, capacity, allocation and inventory data.
              </CardDescription>
            </div>
            <div className="flex flex-col items-start gap-2 lg:items-end">
              {!fallback && (
                <WarehouseCameraControls
                  onCommand={(c) => store.getState().sendCamera(c)}
                  onFocusFloor={model.hasFloors ? () => focusFloorId && store.getState().sendCamera("focus", focusFloorId) : undefined}
                  focusFloorEnabled={Boolean(focusFloorId)}
                  onFocusRack={() => focusRackId && store.getState().sendCamera("focus", focusRackId)}
                  focusRackEnabled={Boolean(focusRackId)}
                />
              )}
              <div className="flex flex-wrap items-center gap-2">
                {canConfigure && (
                  <button
                    type="button"
                    onClick={() => setConfigOpen(true)}
                    disabled={Boolean(demo)}
                    title={demo ? "Switch to live data to edit the layout" : "Define rows, racks, levels and positions"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-moveit-border bg-moveit-panel px-2.5 py-1.5 text-[11px] font-semibold text-moveit-text hover:bg-moveit-surface disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Configure Layout
                  </button>
                )}
                {demoAvailable && (
                  <button
                    type="button"
                    onClick={toggleDemo}
                    aria-pressed={demoEnabled}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-moveit-text hover:bg-amber-500/20 cursor-pointer"
                  >
                    <FlaskConical className="h-3.5 w-3.5 text-amber-500" /> {demoEnabled ? "Demo layout: ON (dev only)" : "Demo layout: OFF"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {demo && (
            <p role="note" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-moveit-text">
              <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>{DEMO_LAYOUT_NOTICE}</span>
            </p>
          )}

          <div className="flex flex-col gap-3">
            {model.hasFloors && <WarehouseFloorSelector floors={model.floors} selectedFloorId={selectedFloorId} onSelect={selectFloor} />}
            <WarehouseFilterBar
              zones={zoneOptions}
              zoneId={filter.zoneId}
              status={filter.status}
              query={filter.query}
              hits={hits}
              matchCount={computedMatches ? computedMatches.size : null}
              onZone={onZone}
              onStatus={(status) => setFilter((f) => ({ ...f, status }))}
              onQuery={(query) => setFilter((f) => ({ ...f, query }))}
              onPickHit={pickHit}
              onClear={clearFilters}
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Scene */}
            <div
              className="relative h-[360px] min-w-0 overflow-hidden sm:h-[460px] lg:h-[620px]"
              style={{
                background:
                  theme === "dark"
                    ? "radial-gradient(ellipse at 50% 30%, #1c1c1c 0%, #101010 70%)"
                    : "radial-gradient(ellipse at 50% 30%, #ffffff 0%, #ebebe8 75%)",
              }}
            >
              {webgl === null && <SceneMessage>Preparing 3D view…</SceneMessage>}
              {webgl && (
                <SceneBoundary onError={() => setSceneFailed(true)}>
                  <Warehouse3DScene model={model} theme={theme} inventoryLocationIds={inventoryLocationIds} compact={compact} />
                </SceneBoundary>
              )}
              {webgl && <WarehouseSceneLabelLayer />}
              {fallback && (
                <div className="h-full overflow-auto p-4">
                  <p className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-moveit-text">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    3D rendering (WebGL) is not available in this browser. Showing the 2D storage plan built from the same warehouse data.
                  </p>
                  <Warehouse2DPlan
                    floors={model.hasFloors ? warehouse.floors?.filter((f) => selectedFloorId === "ALL" || f.id === selectedFloorId) : undefined}
                    zones={
                      model.hasFloors
                        ? (warehouse.floors ?? []).filter((f) => selectedFloorId === "ALL" || f.id === selectedFloorId).flatMap((f) => f.zones)
                        : warehouse.directZones ?? []
                    }
                    selectedSlotId={selectedId ?? undefined}
                    onSelectSlot={(slot) => select(slot.id, false)}
                  />
                </div>
              )}
              {webgl && (
                <p className="pointer-events-none absolute bottom-2 left-3 hidden text-[10px] font-medium text-moveit-muted sm:block">
                  Drag to orbit · scroll to zoom · right-drag to pan · click a row, rack or position
                </p>
              )}
              {webgl && filtering && matchIds && matchIds.size === 0 && (
                <p role="status" className="absolute left-1/2 top-3 -translate-x-1/2 rounded-lg bg-moveit-panel/95 px-3 py-1.5 text-[11px] font-semibold text-moveit-text shadow">
                  No locations match the current filters
                </p>
              )}
            </div>

            {/* Detail panel */}
            <aside aria-label="Selected location details" className="min-h-[200px] min-w-0 border-t border-moveit-border-soft bg-moveit-panel lg:max-h-[620px] lg:border-l lg:border-t-0">
              <WarehouseLocationPanel
                node={selectedNode}
                model={model}
                unit={unit}
                allocation={selectedAllocation}
                inventory={selectedNode ? inventoryByLocation.get(selectedNode.id) ?? [] : []}
                can={can}
                canConfigure={canConfigure && !demo}
                onConfigure={() => setConfigOpen(true)}
                notes={selectedNotes}
                onSelect={(id) => select(id)}
                onFocus={(id) => store.getState().sendCamera("focus", id)}
                onClose={() => store.getState().setSelected(null)}
              />
            </aside>
          </div>

          <div className="border-t border-moveit-border-soft p-3">
            <WarehouseStatusLegend counts={statusCounts} unlinkedCount={unlinkedCount} activeStatus={filter.status} onToggle={(status) => setFilter((f) => ({ ...f, status }))} />
          </div>

          <WarehouseLocationList
            model={model}
            unit={unit}
            matchIds={matchIds}
            selectedId={selectedId}
            selectedFloorId={selectedFloorId}
            defaultOpen={fallback}
            onSelect={(id) => select(id)}
          />
        </CardContent>
      </Card>

      <WarehouseCapacitySummary
        scopeLabel={summary.scope}
        unit={unit}
        totalCapacity={summary.total}
        occupied={summary.occupied}
        reserved={summary.reserved}
        available={summary.available}
        utilization={summary.utilization}
      />

      <WarehouseLocationTooltip node={hoveredNode} unit={unit} />
      <WarehouseLayoutConfigModal warehouse={warehouse} open={configOpen} config={storedLayout} onClose={() => setConfigOpen(false)} onSaved={setStoredLayout} />
    </section>
  );
}
