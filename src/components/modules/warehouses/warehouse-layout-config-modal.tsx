"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { LayoutGrid, Plus, Trash2, X } from "lucide-react";
import { Warehouse } from "@/types";
import { RowLayoutConfig, WarehouseLayoutConfig, rowLetter } from "@/lib/utils/warehouse-visual-adapter";
import { services } from "@/services";

interface Group {
  id: string;
  label: string;
}

/** Zones (that are not open-floor) and zone-less floors are the places a rack skeleton can be defined. */
function groupsOf(warehouse: Warehouse): Group[] {
  const out: Group[] = [];
  const isOpen = (z: { isOpenFloor?: boolean; racks?: unknown[]; directSlots?: unknown[] }) =>
    Boolean(z.isOpenFloor) || ((z.directSlots?.length ?? 0) > 0 && (z.racks?.length ?? 0) === 0);
  for (const f of warehouse.floors ?? []) {
    const zones = (f.zones ?? []).filter((z) => !isOpen(z));
    if ((f.zones ?? []).length === 0) out.push({ id: f.id, label: `${f.name} (no zones)` });
    zones.forEach((z) => out.push({ id: z.id, label: `${f.name} › ${z.name}` }));
  }
  for (const z of warehouse.directZones ?? []) if (!isOpen(z)) out.push({ id: z.id, label: z.name });
  return out;
}

const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)));

export interface WarehouseLayoutConfigModalProps {
  warehouse: Warehouse;
  open: boolean;
  config: WarehouseLayoutConfig;
  onClose: () => void;
  onSaved: (config: WarehouseLayoutConfig) => void;
}

/** Mounted only while open, so the draft is initialised from the stored layout each time. */
export function WarehouseLayoutConfigModal({ warehouse, open, config, onClose, onSaved }: WarehouseLayoutConfigModalProps) {
  if (!open) return null;
  return <LayoutConfigBody warehouse={warehouse} config={config} onClose={onClose} onSaved={onSaved} />;
}

function LayoutConfigBody({ warehouse, config, onClose, onSaved }: Omit<WarehouseLayoutConfigModalProps, "open">) {
  const open = true;
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const groups = React.useMemo(() => groupsOf(warehouse), [warehouse]);
  const [draft, setDraft] = React.useState<WarehouseLayoutConfig>(() => JSON.parse(JSON.stringify(config ?? {})));

  const save = async (next: WarehouseLayoutConfig) => {
    setBusy(true);
    setError(null);
    try {
      onSaved(await services.warehouseService.saveLayoutConfig(warehouse.id, next));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the layout.");
    } finally {
      setBusy(false);
    }
  };

  const update = (gid: string, rows: RowLayoutConfig[]) => setDraft((d) => ({ ...d, [gid]: rows }));
  const field = "h-8 w-full rounded-lg border border-moveit-border bg-moveit-surface px-2 text-xs font-semibold text-moveit-text focus:outline-none focus:ring-2 focus:ring-moveit-orange";

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-moveit-border bg-moveit-panel text-moveit-text shadow-2xl">
          <div className="flex items-start justify-between border-b border-moveit-border-soft p-4">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-sm font-bold">
                <LayoutGrid className="h-4 w-4 text-moveit-orange" /> Configure 3D layout
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[11px] text-moveit-muted">
                Defines the physical skeleton drawn in 3D: rows, racks per row, levels and positions per level. This is presentation metadata only.
                It creates no storage records or capacity; existing storage records fill the skeleton in order and unfilled cells show as “Not linked”.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1.5 text-moveit-muted hover:bg-moveit-surface cursor-pointer" aria-label="Close">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {error && (
            <p role="alert" className="mx-4 mt-3 rounded-lg border border-moveit-danger/50 bg-moveit-danger/10 p-2 text-[11px]">
              {error}
            </p>
          )}
          <div className="flex-1 space-y-5 overflow-auto p-4">
            {groups.length === 0 && <p className="text-xs text-moveit-muted">This warehouse has no floors or rack zones to configure.</p>}
            {groups.map((g) => {
              const rows = draft[g.id] ?? [];
              return (
                <section key={g.id} aria-label={g.label} className="rounded-lg border border-moveit-border-soft p-3">
                  <h4 className="mb-2 text-xs font-bold">{g.label}</h4>
                  {rows.length === 0 && <p className="mb-2 text-[11px] text-moveit-muted">No skeleton: racks are grouped into rows automatically.</p>}
                  <div className="space-y-2">
                    {rows.map((r, i) => (
                      <div key={i} className="grid grid-cols-[3.5rem_1fr_1fr_1fr_2rem] items-end gap-2">
                        <span className="pb-1.5 text-xs font-semibold">Row {rowLetter(i)}</span>
                        {([
                          ["racks", "Racks", 1, 60],
                          ["levels", "Levels", 1, 10],
                          ["positionsPerLevel", "Positions / level", 1, 20],
                        ] as const).map(([key, label, min, max]) => (
                          <label key={key} className="text-[10px] font-semibold text-moveit-muted">
                            {label}
                            <input
                              type="number"
                              min={min}
                              max={max}
                              value={r[key]}
                              onChange={(e) => update(g.id, rows.map((x, xi) => (xi === i ? { ...x, [key]: num(e.target.value, min, max) } : x)))}
                              className={field}
                            />
                          </label>
                        ))}
                        <button
                          type="button"
                          onClick={() => update(g.id, rows.filter((_, xi) => xi !== i))}
                          className="mb-0.5 rounded-lg p-1.5 text-moveit-muted hover:bg-moveit-surface hover:text-moveit-danger cursor-pointer"
                          aria-label={`Remove row ${rowLetter(i)}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => update(g.id, [...rows, rows[rows.length - 1] ? { ...rows[rows.length - 1] } : { racks: 8, levels: 4, positionsPerLevel: 4 }])}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-moveit-orange hover:underline cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add row
                  </button>
                </section>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-moveit-border-soft p-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => save({})}
              className="text-[11px] font-semibold text-moveit-muted hover:text-moveit-danger cursor-pointer"
            >
              Reset layout
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-moveit-border px-3 py-1.5 text-xs font-semibold hover:bg-moveit-surface cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const next: WarehouseLayoutConfig = {};
                  for (const g of groups) if ((draft[g.id] ?? []).length) next[g.id] = draft[g.id];
                  save(next);
                }}
                className="rounded-lg bg-moveit-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-moveit-orange-dark cursor-pointer"
              >
                Save layout
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
