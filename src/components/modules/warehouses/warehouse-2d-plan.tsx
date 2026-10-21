"use client";

import { Box } from "lucide-react";
import { Floor, LocationStatus, Rack, WarehouseSlot, Zone } from "@/types";

interface Warehouse2DPlanProps {
  floors?: Floor[];
  zones: Zone[];
  selectedSlotId?: string;
  onSelectSlot: (slot: WarehouseSlot, path: string) => void;
}

const statusStyles: Record<LocationStatus, string> = {
  AVAILABLE: "border-emerald-400 bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  PARTIALLY_OCCUPIED: "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200",
  OCCUPIED: "border-rose-400 bg-rose-100 text-rose-900 hover:bg-rose-200",
  RESERVED: "border-sky-400 bg-sky-100 text-sky-900 hover:bg-sky-200",
  BLOCKED: "border-slate-400 bg-slate-200 text-slate-700 hover:bg-slate-300",
};

function slotRows(zone: Zone): { label: string; slots: WarehouseSlot[]; rack?: Rack }[] {
  const slots = zone.directSlots || [];
  if (slots.length) return [{ label: "Floor bays", slots }];
  return (zone.racks || []).map((rack) => ({ label: rack.name, slots: rack.slots || [], rack }));
}

export function Warehouse2DPlan({ floors, zones, selectedSlotId, onSelectSlot }: Warehouse2DPlanProps) {
  const floorName = floors?.length === 1 ? floors[0].name : undefined;

  return (
    <div className="overflow-auto rounded-2xl border border-moveit-border bg-[#eef2f5] p-4 sm:p-6">
      <div className="mx-auto min-w-[680px] max-w-6xl rounded-[28px] border-[10px] border-slate-700 bg-slate-100 p-3 shadow-inner">
        <div className="flex items-center justify-between rounded-t-xl border-b border-slate-300 bg-slate-800 px-5 py-3 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Top-down warehouse plan</p>
            <h3 className="text-sm font-bold">{floorName || "Facility floor plan"}</h3>
          </div>
          <div className="text-[10px] font-semibold text-slate-300">Schematic · based on configured locations</div>
        </div>

        <div className="grid grid-cols-1 gap-3 bg-slate-200 p-3 md:grid-cols-2">
          {zones.length === 0 ? (
            <div className="col-span-full rounded-lg border border-dashed border-slate-400 bg-white p-10 text-center text-sm text-slate-500">No storage zones are configured for this view.</div>
          ) : zones.map((zone) => {
            const rows = slotRows(zone);
            return (
              <section key={zone.id} className="min-h-52 rounded-xl border-2 border-slate-400 bg-white p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                  <div><h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">{zone.name}</h4><p className="text-[10px] font-mono text-slate-500">{zone.code}</p></div>
                  <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{zone.isOpenFloor ? "OPEN FLOOR" : `${zone.racks?.length || 0} RACKS`}</span>
                </div>
                {rows.length ? <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[54px_1fr] items-stretch gap-2">
                      <div className="flex items-center justify-center rounded bg-slate-700 px-1 text-center text-[9px] font-bold text-white [writing-mode:vertical-rl]">{row.label}</div>
                      <div className="grid min-h-12 gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.min(row.slots.length, 10))}, minmax(42px, 1fr))` }}>
                        {row.slots.map((slot) => <button key={slot.id} type="button" title={`${slot.code} · ${slot.status}`} aria-label={`${slot.code}, ${slot.status}`} onClick={() => onSelectSlot(slot, `${zone.code}${row.rack ? ` > ${row.rack.name}` : " > Floor bay"} > ${slot.code}`)} className={`min-h-12 rounded border-2 p-1 text-center transition-colors ${statusStyles[slot.status]} ${selectedSlotId === slot.id ? "ring-2 ring-blue-600 ring-offset-1" : ""}`}>
                          <Box className="mx-auto h-3.5 w-3.5" /><span className="mt-0.5 block truncate text-[8px] font-bold">{slot.code}</span>
                        </button>)}
                        {!row.slots.length && <div className="col-span-full flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-[10px] text-slate-400">No bays configured</div>}
                      </div>
                    </div>
                  ))}
                </div> : <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">Zone footprint · no rack or bay locations configured</div>}
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-between rounded-b-xl border-t border-slate-300 bg-slate-800 px-5 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          <span>Warehouse aisle</span><span>Click a bay to inspect capacity and status</span><span>2D location map</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] font-semibold text-slate-600">
        {Object.entries(statusStyles).map(([status, style]) => <span key={status} className="flex items-center gap-1.5"><i className={`h-3 w-3 rounded-sm border ${style.split(" ").slice(0, 2).join(" ")}`} />{status.replaceAll("_", " ")}</span>)}
      </div>
    </div>
  );
}
