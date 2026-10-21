"use client";

import * as React from "react";
import Link from "next/link";
import { Box, ExternalLink, FileText, Focus, LayoutGrid, Package, User, X } from "lucide-react";
import { CapacityUnit, InventoryRecord, StorageAllocation } from "@/types";
import { WarehouseVisualNode, WarehouseVisualModel } from "@/lib/utils/warehouse-visual-adapter";
import { LocationStatusPill } from "./warehouse-status-legend";
import { NODE_TYPE_LABEL, countsText, formatCapacity, utilizationOf } from "./warehouse-location-tooltip";

export interface LocationPanelPermissions {
  customers: boolean;
  allocations: boolean;
  inventory: boolean;
}

export interface WarehouseLocationPanelProps {
  node: WarehouseVisualNode | null;
  model: WarehouseVisualModel;
  unit: CapacityUnit;
  allocation?: StorageAllocation;
  inventory: InventoryRecord[];
  can: LocationPanelPermissions;
  /** user may open the layout configuration (existing WAREHOUSES:EDIT permission) */
  canConfigure: boolean;
  notes?: string;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onClose: () => void;
  onConfigure: () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-moveit-border-soft py-1.5 text-xs last:border-0">
      <dt className="text-moveit-muted">{label}</dt>
      <dd className="text-right font-semibold text-moveit-text">{value}</dd>
    </div>
  );
}

function childrenOf(node: WarehouseVisualNode): WarehouseVisualNode[] {
  if (node.type === "rack") return (node.children ?? []).flatMap((l) => l.children ?? []);
  if (node.type === "shelf") return node.children ?? [];
  return node.children ?? [];
}

const CHILD_CAP = 40;

/** Right-hand detail panel (stacks under the scene on small screens). Text equivalent of the selected 3D object. */
export function WarehouseLocationPanel({
  node,
  model,
  unit,
  allocation,
  inventory,
  can,
  canConfigure,
  notes,
  onSelect,
  onFocus,
  onClose,
  onConfigure,
}: WarehouseLocationPanelProps) {
  if (!node) {
    return (
      <div className="flex h-full flex-col justify-center gap-2 p-5 text-xs text-moveit-muted">
        <Box aria-hidden className="h-6 w-6 text-moveit-orange" />
        <p className="font-semibold text-moveit-text">Nothing selected</p>
        <p>Click a floor, row, rack or storage position in the 3D view (or pick one from the location list) to see its capacity, allocation and inventory.</p>
      </div>
    );
  }

  const isPosition = node.type === "slot";
  const linkedPosition = isPosition && !node.unlinked;
  const packageCount = inventory.length;
  const itemCount = inventory.reduce((sum, r) => sum + Math.max(0, r.itemCount - (r.releasedItemCount ?? 0)), 0);
  const mismatch = allocation && linkedPosition && allocation.locationId !== node.id;
  const util = utilizationOf(node);
  const kids = isPosition ? [] : childrenOf(node);
  const emptyFloor = node.type === "floor" && (node.counts?.racks ?? 0) === 0 && (node.counts?.bays ?? 0) === 0;

  return (
    <div className="flex h-full flex-col" aria-live="polite">
      <div className="flex items-start justify-between gap-3 border-b border-moveit-border-soft p-4">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-moveit-orange">
            {NODE_TYPE_LABEL[node.type]} details
          </span>
          <h4 className="truncate text-sm font-bold text-moveit-text">{node.code ?? node.label}</h4>
          <p className="truncate text-[11px] text-moveit-muted" title={node.path}>
            {node.path}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onFocus(node.id)}
            className="rounded-lg p-1.5 text-moveit-muted hover:bg-moveit-surface hover:text-moveit-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange"
            aria-label="Focus camera on this item"
            title="Focus camera"
          >
            <Focus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-moveit-muted hover:bg-moveit-surface hover:text-moveit-text cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange"
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-auto p-4">
        {node.isDemo && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-moveit-text">
            Demo test data. This {NODE_TYPE_LABEL[node.type].toLowerCase()} is a visualisation fixture, not a business record.
          </p>
        )}
        {node.unlinked && (
          <p className="rounded-lg border border-dashed border-moveit-border bg-moveit-surface p-2 text-[11px] text-moveit-muted">
            This layout position has no storage record linked, so it has no status, capacity, allocation or inventory.
          </p>
        )}

        {emptyFloor && (
          <div className="rounded-lg border border-dashed border-moveit-border bg-moveit-surface p-3 text-xs">
            <p className="font-semibold text-moveit-text">No storage layout configured for this floor.</p>
            <p className="mt-1 text-moveit-muted">Rows and racks are drawn from a layout skeleton; no racks are invented.</p>
            {canConfigure && (
              <button
                type="button"
                onClick={onConfigure}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-moveit-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-moveit-orange-dark cursor-pointer"
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Configure Layout
              </button>
            )}
          </div>
        )}

        {node.status && !node.unlinked && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-moveit-muted">Status</span>
            <LocationStatusPill status={node.status} />
          </div>
        )}

        {isPosition && node.level !== undefined && node.bay !== undefined && (
          <dl>
            <Row label="Position in rack" value={`Level ${node.level} · Bay ${node.bay}`} />
          </dl>
        )}

        {!isPosition && (
          <dl>
            {countsText(node) && <Row label="Contains" value={countsText(node)} />}
            {util !== undefined && <Row label="Utilization" value={`${util}%${node.derived ? " (from positions)" : ""}`} />}
          </dl>
        )}

        {node.capacity !== undefined && !node.unlinked && (
          <dl>
            <Row label="Capacity" value={formatCapacity(node.capacity, unit)} />
            {node.occupied !== undefined && <Row label="Occupied" value={formatCapacity(node.occupied, unit)} />}
            {node.reserved !== undefined && <Row label="Reserved" value={formatCapacity(node.reserved, unit)} />}
            {node.available !== undefined && <Row label="Available" value={formatCapacity(node.available, unit)} />}
          </dl>
        )}

        {linkedPosition && (
          <dl>
            {can.customers && allocation && (
              <Row
                label="Customer"
                value={
                  <Link href={`/customers/${allocation.customerId}`} className="inline-flex items-center gap-1 text-moveit-orange hover:underline">
                    <User className="h-3 w-3" />
                    {allocation.customerName}
                  </Link>
                }
              />
            )}
            {can.allocations && allocation && (
              <>
                <Row label="Allocation" value={<span className="font-mono">{allocation.allocationCode}</span>} />
                <Row label="Allocation status" value={allocation.status.replace(/_/g, " ")} />
              </>
            )}
            {can.inventory && (
              <Row
                label="Inventory"
                value={packageCount > 0 ? `${packageCount} package${packageCount === 1 ? "" : "s"} · ${itemCount} item${itemCount === 1 ? "" : "s"}` : "No stored packages"}
              />
            )}
            {node.storageType && <Row label="Storage type" value={node.storageType.replace(/_/g, " ")} />}
          </dl>
        )}

        {mismatch && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-moveit-text">
            The linked allocation record points to a different location ({allocation.locationPath}). Check the allocation before relying on this link.
          </p>
        )}

        {linkedPosition && can.customers && notes && !node.isDemo && (
          <p className="rounded-lg bg-moveit-surface p-2 text-[11px] text-moveit-muted">{notes}</p>
        )}

        {kids.length > 0 && (
          <div>
            <h5 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-moveit-muted">
              {node.type === "floor" ? "Zones" : node.type === "zone" ? "Rows & bays" : node.type === "row" ? "Racks" : "Positions"} ({kids.length})
            </h5>
            <ul className="max-h-48 space-y-1 overflow-auto">
              {kids.slice(0, CHILD_CAP).map((k) => (
                <li key={k.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(k.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-moveit-border-soft bg-moveit-surface px-2 py-1.5 text-left text-[11px] hover:border-moveit-orange cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moveit-orange"
                  >
                    <span className="truncate font-semibold text-moveit-text">{k.label}</span>
                    {k.status && !k.unlinked ? <LocationStatusPill status={k.status} /> : k.unlinked ? <span className="text-[10px] text-moveit-muted">not linked</span> : null}
                  </button>
                </li>
              ))}
              {kids.length > CHILD_CAP && <li className="px-1 text-[11px] text-moveit-muted">+{kids.length - CHILD_CAP} more (use the location list)</li>}
            </ul>
          </div>
        )}

        {linkedPosition && inventory.length > 0 && can.inventory && (
          <div>
            <h5 className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-moveit-muted">
              <Package className="h-3 w-3" /> Stored packages
            </h5>
            <ul className="space-y-1">
              {inventory.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/inventory/${r.id}`}
                    className="flex items-center justify-between rounded-lg border border-moveit-border-soft bg-moveit-surface px-2 py-1.5 text-[11px] hover:border-moveit-orange"
                  >
                    <span className="truncate font-mono font-semibold text-moveit-text">{r.inventoryCode}</span>
                    <span className="shrink-0 text-moveit-muted">{r.itemCount} items</span>
                  </Link>
                </li>
              ))}
              {inventory.length > 4 && <li className="text-[11px] text-moveit-muted">+{inventory.length - 4} more</li>}
            </ul>
          </div>
        )}
      </div>

      {linkedPosition && ((can.allocations && allocation) || (can.inventory && inventory.length > 0)) && (
        <div className="flex flex-wrap gap-2 border-t border-moveit-border-soft p-3">
          {can.allocations && allocation && (
            <Link
              href={`/allocations/${allocation.id}`}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-moveit-orange px-3 py-2 text-xs font-semibold text-white hover:bg-moveit-orange-dark"
            >
              <FileText className="h-3.5 w-3.5" /> View Details
            </Link>
          )}
          {can.inventory && inventory.length > 0 && (
            <Link
              href={inventory.length === 1 ? `/inventory/${inventory[0].id}` : "/inventory"}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-moveit-border bg-moveit-panel px-3 py-2 text-xs font-semibold text-moveit-text hover:bg-moveit-surface"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View Inventory
            </Link>
          )}
        </div>
      )}
      <span className="sr-only">
        Selected {NODE_TYPE_LABEL[node.type]} {node.code ?? node.label}, in {model.root.name}
      </span>
    </div>
  );
}
