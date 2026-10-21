"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Ban, Boxes, ChevronDown, ChevronRight, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { services } from "@/services";
import { useUIStore } from "@/store/use-ui-store";
import { Customer, PackageType, Rack, StorageAllocation, UserRole, Warehouse, WarehouseSlot, Zone, hasPermission } from "@/types";
import { allocateToPosition, releaseAllocationSpace } from "./warehouse-allocate";
import { LocationStatusPill } from "./warehouse-status-legend";

const input =
  "h-8 w-full rounded-lg border border-moveit-border bg-moveit-surface px-2 text-xs font-semibold text-moveit-text placeholder:text-moveit-dim focus:outline-none focus:ring-2 focus:ring-moveit-orange";
const btn =
  "inline-flex items-center gap-1 rounded-lg border border-moveit-border bg-moveit-panel px-2 py-1 text-[11px] font-semibold text-moveit-text hover:bg-moveit-surface cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const primary =
  "inline-flex items-center gap-1 rounded-lg bg-moveit-orange px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-moveit-orange-dark cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

type Run = (fn: () => Promise<Warehouse>, success?: string) => Promise<boolean>;

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-[10px] font-semibold text-moveit-muted ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}

/** Small inline form: renders its fields, calls onSubmit, resets on success. */
function AddForm({ title, children, onSubmit, submitLabel = "Add" }: { title: string; children: React.ReactNode; onSubmit: () => Promise<boolean>; submitLabel?: string }) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-moveit-orange hover:underline cursor-pointer">
        <Plus className="h-3 w-3" /> {title}
      </button>
    );
  }
  return (
    <form
      className="rounded-lg border border-moveit-border-soft bg-moveit-surface/60 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSubmit();
        setBusy(false);
        if (ok) setOpen(false);
      }}
    >
      <p className="mb-2 text-[11px] font-bold text-moveit-text">{title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
      <div className="mt-2 flex gap-2">
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function RackAdder({ zone, run }: { zone: Zone; run: Run }) {
  const [v, setV] = React.useState({ name: "", code: "", row: "A", levels: "4", ppl: "4", cap: "250" });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <AddForm
      title="Add rack"
      onSubmit={() =>
        run(
          () =>
            services.warehouseService.createRack(zone.id, {
              name: v.name,
              code: v.code,
              rowLabel: v.row,
              levels: Number(v.levels),
              positionsPerLevel: Number(v.ppl),
              positionCapacitySqFt: Number(v.cap),
            }),
          "Rack added."
        )
      }
    >
      <Field label="Rack name"><input className={input} value={v.name} onChange={set("name")} placeholder="Rack A-01" required /></Field>
      <Field label="Rack code"><input className={input} value={v.code} onChange={set("code")} placeholder="DXB-F1-ZA-A01" required /></Field>
      <Field label="Row"><input className={input} value={v.row} onChange={set("row")} placeholder="A" maxLength={3} /></Field>
      <Field label="Levels"><input className={input} type="number" min={1} max={12} value={v.levels} onChange={set("levels")} required /></Field>
      <Field label="Positions per level"><input className={input} type="number" min={1} max={30} value={v.ppl} onChange={set("ppl")} required /></Field>
      <Field label="Capacity per position (SQ.FT)"><input className={input} type="number" min={1} value={v.cap} onChange={set("cap")} required /></Field>
    </AddForm>
  );
}

interface StructureCtxValue {
  warehouse: Warehouse;
  role: UserRole;
  customers: Customer[];
  allocations: StorageAllocation[];
  canAllocate: boolean;
  canRelease: boolean;
  /** run a call that changes space, then refresh the warehouse + allocations */
  runSpace: (fn: () => Promise<unknown>, success: string) => Promise<boolean>;
}
const StructureCtx = React.createContext<StructureCtxValue | null>(null);
const useStructure = () => React.useContext(StructureCtx) as StructureCtxValue;

const PACKAGE_TYPES: PackageType[] = ["PALLET", "BOX", "CRATE", "CONTAINER", "LOOSE", "RACK_UNIT", "CUSTOM"];
const free = (s: WarehouseSlot) => Math.max(0, s.totalCapacitySqFt - s.occupiedCapacitySqFt - s.reservedCapacitySqFt);

/** Customer + exact SQ.FT + the material being stored. Reserve-only, part-occupied or fully occupied. */
function AllocateForm({ maxSqFt, onSubmit, onCancel, submitLabel = "Allocate" }: { maxSqFt: number; onSubmit: (v: { customerId: string; space: number; occupied: number; material: string; quantity: number; packageType: PackageType }) => Promise<boolean>; onCancel: () => void; submitLabel?: string }) {
  const { customers } = useStructure();
  const [v, setV] = React.useState({ customerId: "", space: String(maxSqFt || ""), occupied: "0", material: "", quantity: "1", packageType: "PALLET" as PackageType });
  const [busy, setBusy] = React.useState(false);
  const space = Number(v.space) || 0;
  const occupied = Number(v.occupied) || 0;
  const outcome = space <= 0 ? "" : occupied <= 0 ? "Reserved (blue)" : occupied < space ? "Partially occupied (orange)" : "Occupied (red)";
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }));
  return (
    <form
      className="rounded-lg border border-moveit-border-soft bg-moveit-surface/60 p-2.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await onSubmit({ customerId: v.customerId, space, occupied, material: v.material, quantity: Number(v.quantity) || 0, packageType: v.packageType });
        setBusy(false);
        if (ok) onCancel();
      }}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Customer">
          <select className={input} value={v.customerId} onChange={set("customerId")} required>
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Space to allocate (SQ.FT, max ${maxSqFt.toLocaleString()})`}>
          <input className={input} type="number" min={1} max={maxSqFt} value={v.space} onChange={set("space")} required />
        </Field>
        <Field label="Occupied now (SQ.FT, 0 = reserve only)">
          <input className={input} type="number" min={0} max={space || undefined} value={v.occupied} onChange={set("occupied")} />
        </Field>
        <Field label="Material / goods">
          <input className={input} value={v.material} onChange={set("material")} placeholder="e.g. Marble tiles" />
        </Field>
        <Field label="Quantity">
          <input className={input} type="number" min={1} value={v.quantity} onChange={set("quantity")} />
        </Field>
        <Field label="Package type">
          <select className={input} value={v.packageType} onChange={set("packageType")}>
            {PACKAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className={primary}>
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className={btn}>
          Cancel
        </button>
        {outcome && <span className="text-[11px] text-moveit-muted">Result: {outcome}</span>}
      </div>
    </form>
  );
}

function SlotAdder({ parentId, label, defaults, run }: { parentId: string; label: string; defaults: { name: string; cap: string }; run: Run }) {
  const [v, setV] = React.useState({ name: defaults.name, code: "", cap: defaults.cap });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return (
    <AddForm title={label} onSubmit={() => run(() => services.warehouseService.createSlot(parentId, { name: v.name, code: v.code, capacitySqFt: Number(v.cap) }), "Added.")}>
      <Field label="Name"><input className={input} value={v.name} onChange={set("name")} required /></Field>
      <Field label="Code"><input className={input} value={v.code} onChange={set("code")} required /></Field>
      <Field label="Capacity (SQ.FT)"><input className={input} type="number" min={1} value={v.cap} onChange={set("cap")} required /></Field>
    </AddForm>
  );
}

function SlotRow({ slot, can, run }: { slot: WarehouseSlot; can: Perms; run: Run }) {
  const ctx = useStructure();
  const [allocating, setAllocating] = React.useState(false);
  const blocked = slot.status === "BLOCKED";
  const available = free(slot);
  const mine = ctx.allocations.filter((a) => a.locationId === slot.id && (a.status === "CONFIRMED" || a.status === "ACTIVE"));
  return (
    <li className="rounded-md border border-moveit-border-soft px-2 py-1 text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono font-semibold text-moveit-text">{slot.code}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-moveit-muted">
            {slot.occupiedCapacitySqFt.toLocaleString()} occ · {slot.reservedCapacitySqFt.toLocaleString()} res · {available.toLocaleString()} free of {slot.totalCapacitySqFt.toLocaleString()} SQ.FT
          </span>
          <LocationStatusPill status={slot.status} />
          {ctx.canAllocate && !blocked && available > 0 && (
            <button type="button" className={btn} onClick={() => setAllocating((a) => !a)}>
              <Plus className="h-3 w-3" /> Allocate
            </button>
          )}
          {can.edit && (
            <button type="button" className={btn} onClick={() => run(() => services.warehouseService.updateSlot(slot.id, { blocked: !blocked }))} title={blocked ? "Release position" : "Block position"}>
              <Ban className="h-3 w-3" /> {blocked ? "Unblock" : "Block"}
            </button>
          )}
          {can.del && (
            <button type="button" className={btn} onClick={() => confirm(`Delete position ${slot.code}?`) && run(() => services.warehouseService.deleteSlot(slot.id), "Position deleted.")} aria-label={`Delete position ${slot.code}`}>
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </span>
      </div>
      {mine.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {mine.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded bg-moveit-surface px-2 py-1">
              <span className="text-moveit-text">
                <strong>{a.customerName}</strong> · {a.allocatedCapacity.toLocaleString()} SQ.FT · {a.allocationCode} · {a.status}
              </span>
              {ctx.canRelease && (
                <button type="button" className={btn} onClick={() => confirm(`Release ${a.customerName}'s ${a.allocatedCapacity} SQ.FT? Stored goods are taken out.`) && ctx.runSpace(() => releaseAllocationSpace(a, ctx.role), "Space released.")}>
                  Release
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {allocating && (
        <div className="mt-2">
          <AllocateForm
            maxSqFt={available}
            onCancel={() => setAllocating(false)}
            onSubmit={(v) =>
              ctx.runSpace(
                () =>
                  allocateToPosition({
                    warehouseId: ctx.warehouse.id,
                    slotId: slot.id,
                    customerId: v.customerId,
                    role: ctx.role,
                    spaceSqFt: v.space,
                    occupiedSqFt: v.occupied,
                    goods: { packageType: v.packageType, material: v.material, quantity: v.quantity },
                    storageType: slot.storageType === "FLOOR" ? "FLOOR" : "SLOT",
                  }),
                "Space allocated."
              )
            }
          />
        </div>
      )}
    </li>
  );
}

function RackBlock({ rack, can, run }: { rack: Rack; can: Perms; run: Run }) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState({ name: rack.name, row: rack.rowLabel ?? "" });
  return (
    <li className="rounded-lg border border-moveit-border-soft bg-moveit-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-xs font-semibold text-moveit-text cursor-pointer">
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {rack.name}
          <span className="font-mono text-[10px] font-normal text-moveit-muted">{rack.code}</span>
        </button>
        <span className="flex items-center gap-2 text-[11px] text-moveit-muted">
          Row {rack.rowLabel || "—"} · {(rack.slots ?? []).length} positions
          {can.edit && (
            <button type="button" className={btn} onClick={() => setEditing((e) => !e)} aria-label={`Edit rack ${rack.name}`}>
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {can.del && (
            <button type="button" className={btn} onClick={() => confirm(`Delete rack ${rack.name} and its ${(rack.slots ?? []).length} positions?`) && run(() => services.warehouseService.deleteRack(rack.id), "Rack deleted.")} aria-label={`Delete rack ${rack.name}`}>
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </span>
      </div>
      {editing && (
        <div className="flex flex-wrap items-end gap-2 border-t border-moveit-border-soft px-2.5 py-2">
          <Field label="Name"><input className={input} value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} /></Field>
          <Field label="Row"><input className={input} value={v.row} maxLength={3} onChange={(e) => setV((s) => ({ ...s, row: e.target.value }))} /></Field>
          <button type="button" className={primary} onClick={async () => (await run(() => services.warehouseService.updateRack(rack.id, { name: v.name, rowLabel: v.row }), "Rack updated.")) && setEditing(false)}>
            Save
          </button>
        </div>
      )}
      {open && (
        <div className="space-y-2 border-t border-moveit-border-soft p-2.5">
          <ul className="max-h-56 space-y-1 overflow-auto">
            {(rack.slots ?? []).map((s) => (
              <SlotRow key={s.id} slot={s} can={can} run={run} />
            ))}
          </ul>
          {can.create && <SlotAdder parentId={rack.id} label="Add position" defaults={{ name: "Position", cap: "250" }} run={run} />}
        </div>
      )}
    </li>
  );
}

function ZoneBlock({ zone, can, run }: { zone: Zone; can: Perms; run: Run }) {
  const ctx = useStructure();
  const [allocating, setAllocating] = React.useState(false);
  const open = Boolean(zone.isOpenFloor);
  const bays = zone.directSlots ?? [];
  const carved = [...(zone.racks ?? []).flatMap((r) => r.slots ?? []), ...bays].filter((s) => s.status !== "BLOCKED").reduce((t, s) => t + s.totalCapacitySqFt, 0);
  const declared = zone.declaredCapacitySqFt;
  const unassigned = declared === undefined ? undefined : Math.max(0, declared - carved);
  const canCarve = open || declared !== undefined;
  return (
    <div className="space-y-2 rounded-lg border border-moveit-border bg-moveit-surface/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="flex items-center gap-1.5 text-xs font-bold text-moveit-text">
          <Boxes className="h-3.5 w-3.5 text-moveit-orange" /> {zone.name}
          <span className="font-mono text-[10px] font-normal text-moveit-muted">{zone.code}</span>
          {open && <span className="rounded bg-moveit-surface px-1.5 text-[10px] font-semibold text-moveit-muted">Open floor</span>}
          {declared !== undefined && (
            <span className="rounded bg-moveit-surface px-1.5 text-[10px] font-semibold text-moveit-muted">
              {declared.toLocaleString()} SQ.FT · {(unassigned ?? 0).toLocaleString()} unassigned
            </span>
          )}
        </h5>
        <span className="flex flex-wrap gap-2">
          {can.edit && (
            <button type="button" className={btn} onClick={() => { const v = prompt("Zone capacity in SQ.FT", String(declared ?? "")); if (v && Number(v) > 0) run(() => services.warehouseService.updateZone(zone.id, { capacitySqFt: Number(v) }), "Zone capacity updated."); }}>
              <Pencil className="h-3 w-3" /> {declared === undefined ? "Set capacity" : "Edit capacity"}
            </button>
          )}
          {can.edit && (
            <button type="button" className={btn} onClick={() => { const name = prompt("Zone name", zone.name); if (name) run(() => services.warehouseService.updateZone(zone.id, { name }), "Zone updated."); }}>
              <Pencil className="h-3 w-3" /> Rename
            </button>
          )}
          {can.del && (
            <button type="button" className={btn} onClick={() => confirm(`Delete zone ${zone.name} and everything in it?`) && run(() => services.warehouseService.deleteZone(zone.id), "Zone deleted.")}>
              <Trash2 className="h-3 w-3" /> Delete zone
            </button>
          )}
        </span>
      </div>

      {!open && (
        <>
          <ul className="space-y-1.5">
            {(zone.racks ?? []).map((r) => (
              <RackBlock key={r.id} rack={r} can={can} run={run} />
            ))}
            {(zone.racks ?? []).length === 0 && bays.length === 0 && <li className="text-[11px] text-moveit-muted">No racks yet.</li>}
          </ul>
          {can.create && <RackAdder zone={zone} run={run} />}
        </>
      )}

      {!canCarve && ctx.canAllocate && can.create && (
        <p className="rounded-md border border-dashed border-moveit-border px-2.5 py-1.5 text-[11px] text-moveit-muted">
          Want to hand out plain floor space (for example 500 SQ.FT) instead of a rack? Click <strong>Set capacity</strong> above to give this zone a total. You can then allocate space to a customer, and the system will never let the total allocated go above it.
        </p>
      )}

      {(open || bays.length > 0 || canCarve) && (
        <div className="space-y-1.5">
          {(open || bays.length > 0) && <p className="text-[10px] font-bold uppercase tracking-wider text-moveit-muted">Open space / bays</p>}
          <ul className="space-y-1">
            {bays.map((s) => (
              <SlotRow key={s.id} slot={s} can={can} run={run} />
            ))}
            {open && bays.length === 0 && <li className="text-[11px] text-moveit-muted">No bays yet.</li>}
          </ul>
          <div className="flex flex-wrap gap-3">
            {can.create && open && <SlotAdder parentId={zone.id} label="Add open-floor bay" defaults={{ name: "Bay", cap: "1000" }} run={run} />}
            {ctx.canAllocate && can.create && canCarve && (
              <button type="button" className="inline-flex items-center gap-1 text-[11px] font-semibold text-moveit-orange hover:underline cursor-pointer" onClick={() => setAllocating((a) => !a)}>
                <Plus className="h-3 w-3" /> Allocate space to a customer (no rack)
              </button>
            )}
          </div>
          {allocating && (
            <AllocateForm
              maxSqFt={unassigned ?? 100000}
              submitLabel="Allocate space"
              onCancel={() => setAllocating(false)}
              onSubmit={(v) =>
                ctx.runSpace(async () => {
                  const customer = ctx.customers.find((c) => c.id === v.customerId);
                  const code = `${zone.code}-SP-${Date.now().toString(36).toUpperCase()}`;
                  const updated = await services.warehouseService.createSlot(zone.id, { name: `${customer?.name ?? "Customer"} · ${v.space} SQ.FT`, code, capacitySqFt: v.space, storageType: "FLOOR" });
                  const newSlot = updated.floors?.flatMap((f) => f.zones).concat(updated.directZones ?? []).flatMap((z) => z.directSlots ?? []).find((x) => x.code === code);
                  if (!newSlot) throw new Error("The new space could not be created.");
                  try {
                    await allocateToPosition({
                      warehouseId: ctx.warehouse.id,
                      slotId: newSlot.id,
                      customerId: v.customerId,
                      role: ctx.role,
                      spaceSqFt: v.space,
                      occupiedSqFt: v.occupied,
                      goods: { packageType: v.packageType, material: v.material, quantity: v.quantity },
                      storageType: "FLOOR",
                    });
                  } catch (err) {
                    await services.warehouseService.deleteSlot(newSlot.id).catch(() => undefined);
                    throw err;
                  }
                }, "Space allocated.")
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

function ZoneAdder({ warehouseId, floorId, run }: { warehouseId: string; floorId?: string; run: Run }) {
  const [v, setV] = React.useState({ name: "", code: "", open: false, cap: "" });
  return (
    <AddForm title="Add zone" onSubmit={() => run(() => services.warehouseService.createZone(warehouseId, { floorId, name: v.name, code: v.code, isOpenFloor: v.open, capacitySqFt: v.cap ? Number(v.cap) : undefined }), "Zone added.")}>
      <Field label="Zone name"><input className={input} value={v.name} onChange={(e) => setV((s) => ({ ...s, name: e.target.value }))} placeholder="Zone A" required /></Field>
      <Field label="Zone code"><input className={input} value={v.code} onChange={(e) => setV((s) => ({ ...s, code: e.target.value }))} placeholder="ZN-A" required /></Field>
      <Field label="Zone capacity (SQ.FT, optional)"><input className={input} type="number" min={1} value={v.cap} onChange={(e) => setV((s) => ({ ...s, cap: e.target.value }))} placeholder="e.g. 5000" /></Field>
      <label className="flex items-end gap-2 pb-1.5 text-[11px] font-semibold text-moveit-text">
        <input type="checkbox" checked={v.open} onChange={(e) => setV((s) => ({ ...s, open: e.target.checked }))} /> Open-floor storage
      </label>
    </AddForm>
  );
}

interface Perms {
  create: boolean;
  edit: boolean;
  del: boolean;
}

export interface WarehouseStructureManagerProps {
  warehouse: Warehouse;
  open: boolean;
  onClose: () => void;
  onChanged: (w: Warehouse) => void;
}

export function WarehouseStructureManager({ warehouse, open, onClose, onChanged }: WarehouseStructureManagerProps) {
  const role = useUIStore((s) => s.currentRole);
  const can: Perms = {
    create: hasPermission(role, "WAREHOUSES", "CREATE"),
    edit: hasPermission(role, "WAREHOUSES", "EDIT"),
    del: hasPermission(role, "WAREHOUSES", "DELETE"),
  };
  const [message, setMessage] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [allocations, setAllocations] = React.useState<StorageAllocation[]>([]);
  // reserving needs ALLOCATIONS create + approve (confirming); storing goods needs INVENTORY create
  const canAllocate = hasPermission(role, "ALLOCATIONS", "CREATE") && hasPermission(role, "ALLOCATIONS", "APPROVE") && hasPermission(role, "INVENTORY", "CREATE");
  const canRelease = hasPermission(role, "ALLOCATIONS", "RELEASE");

  const loadSpaceData = React.useCallback(async () => {
    try {
      const [c, a] = await Promise.all([services.customerService.getCustomers(), services.allocationService.getAllocations()]);
      setCustomers(c);
      setAllocations(a.filter((x) => x.warehouseId === warehouse.id));
    } catch {
      setCustomers([]);
      setAllocations([]);
    }
  }, [warehouse.id]);
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    Promise.all([services.customerService.getCustomers(), services.allocationService.getAllocations()])
      .then(([c, a]) => {
        if (!active) return;
        setCustomers(c);
        setAllocations(a.filter((x) => x.warehouseId === warehouse.id));
      })
      .catch(() => {
        if (!active) return;
        setCustomers([]);
        setAllocations([]);
      });
    return () => {
      active = false;
    };
  }, [open, warehouse.id]);

  const runSpace = React.useCallback(
    async (fn: () => Promise<unknown>, success: string) => {
      try {
        await fn();
        const updated = await services.warehouseService.getWarehouseById(warehouse.id);
        if (updated) onChanged(updated);
        await loadSpaceData();
        setMessage({ kind: "ok", text: success });
        return true;
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : "Request failed." });
        return false;
      }
    },
    [warehouse.id, onChanged, loadSpaceData]
  );
  const structureCtx = React.useMemo(
    () => ({ warehouse, role, customers, allocations, canAllocate, canRelease, runSpace }),
    [warehouse, role, customers, allocations, canAllocate, canRelease, runSpace]
  );

  const run: Run = React.useCallback(
    async (fn, success) => {
      try {
        const updated = await fn();
        onChanged(updated);
        setMessage(success ? { kind: "ok", text: success } : null);
        return true;
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : "Request failed." });
        return false;
      }
    },
    [onChanged]
  );

  const floors = warehouse.floors ?? [];
  const direct = warehouse.directZones ?? [];
  const hasStructure = floors.length > 0 || direct.length > 0;
  const [floorForm, setFloorForm] = React.useState({ name: "", code: "" });

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-moveit-border bg-moveit-panel text-moveit-text shadow-2xl">
          <div className="flex items-start justify-between border-b border-moveit-border-soft p-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-sm font-bold">
                <Layers className="h-4 w-4 text-moveit-orange" /> Manage warehouse structure
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[11px] text-moveit-muted">
                {warehouse.name}. Floors, zones, racks and positions you add here are saved to the backend and drawn in the 3D explorer. Capacity of racks, zones and floors is rolled up from
                their positions. Your role may {[can.create && "add", can.edit && "edit", can.del && "delete"].filter(Boolean).join(", ") || "only view"} structure.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-moveit-muted hover:bg-moveit-surface cursor-pointer" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {!warehouse.structureManaged && hasStructure && can.edit && (
            <p className="mx-4 mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px]">
              This warehouse was loaded from sample data. After your first change its floor, zone and rack capacity is recalculated from the positions that exist.
            </p>
          )}
          {message && (
            <p
              role={message.kind === "error" ? "alert" : "status"}
              className={`mx-4 mt-3 rounded-lg border p-2 text-[11px] ${message.kind === "error" ? "border-moveit-danger/50 bg-moveit-danger/10" : "border-emerald-500/40 bg-emerald-500/10"}`}
            >
              {message.text}
            </p>
          )}

          <StructureCtx.Provider value={structureCtx}>
          <div className="flex-1 space-y-4 overflow-auto p-4">
            {!hasStructure && <p className="text-xs text-moveit-muted">No floors or zones yet. Start by adding a floor, or a zone if this warehouse has no floors.</p>}

            {floors.map((floor) => (
              <section key={floor.id} aria-label={floor.name} className="space-y-3 rounded-xl border border-moveit-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold">
                    {floor.name} <span className="font-mono text-[10px] font-normal text-moveit-muted">{floor.code}</span>
                  </h4>
                  <span className="flex gap-2">
                    {can.edit && (
                      <button type="button" className={btn} onClick={() => { const name = prompt("Floor name", floor.name); if (name) run(() => services.warehouseService.updateFloor(floor.id, { name }), "Floor updated."); }}>
                        <Pencil className="h-3 w-3" /> Rename
                      </button>
                    )}
                    {can.del && (
                      <button type="button" className={btn} onClick={() => confirm(`Delete ${floor.name} and everything on it?`) && run(() => services.warehouseService.deleteFloor(floor.id), "Floor deleted.")}>
                        <Trash2 className="h-3 w-3" /> Delete floor
                      </button>
                    )}
                  </span>
                </div>
                {(floor.zones ?? []).map((z) => (
                  <ZoneBlock key={z.id} zone={z} can={can} run={run} />
                ))}
                {(floor.zones ?? []).length === 0 && <p className="text-[11px] text-moveit-muted">No zones on this floor yet.</p>}
                {can.create && <ZoneAdder warehouseId={warehouse.id} floorId={floor.id} run={run} />}
              </section>
            ))}

            {direct.length > 0 && (
              <section aria-label="Zones" className="space-y-3">
                {direct.map((z) => (
                  <ZoneBlock key={z.id} zone={z} can={can} run={run} />
                ))}
              </section>
            )}

            {can.create && floors.length === 0 && <ZoneAdder warehouseId={warehouse.id} run={run} />}

            {can.create && direct.length === 0 && (
              <form
                className="rounded-xl border border-dashed border-moveit-border p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (await run(() => services.warehouseService.createFloor(warehouse.id, floorForm), "Floor added.")) setFloorForm({ name: "", code: "" });
                }}
              >
                <p className="mb-2 text-[11px] font-bold">Add floor</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Field label="Floor name"><input className={input} value={floorForm.name} onChange={(e) => setFloorForm((s) => ({ ...s, name: e.target.value }))} placeholder="Floor 1" required /></Field>
                  <Field label="Floor code"><input className={input} value={floorForm.code} onChange={(e) => setFloorForm((s) => ({ ...s, code: e.target.value }))} placeholder="FL-1" required /></Field>
                  <div className="flex items-end">
                    <button type="submit" className={primary}>
                      <Plus className="h-3 w-3" /> Add floor
                    </button>
                  </div>
                </div>
              </form>
            )}

            {!can.create && !can.edit && !can.del && <p className="text-xs text-moveit-muted">Your role has view-only access to warehouse structure.</p>}
          </div>
          </StructureCtx.Provider>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
