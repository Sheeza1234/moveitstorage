import { Warehouse, WarehouseSlot, Floor, Zone, Rack } from "@/types";

export interface ResolvedLocation {
  warehouse: Warehouse;
  floor?: Floor;
  zone?: Zone;
  rack?: Rack;
  slot: WarehouseSlot;
  locationPath: string;
}

export function findLocationInWarehouses(
  warehouses: Warehouse[],
  locationId: string,
  targetWarehouseId?: string
): ResolvedLocation | null {
  const targetWarehouses = targetWarehouseId
    ? warehouses.filter((w) => w.id === targetWarehouseId)
    : warehouses;

  for (const wh of targetWarehouses) {
    // 1. Search Floor-based Hierarchy
    if (wh.floors) {
      for (const fl of wh.floors) {
        if (fl.zones) {
          for (const zn of fl.zones) {
            if (zn.racks) {
              for (const rk of zn.racks) {
                const sl = rk.slots.find((s) => s.id === locationId);
                if (sl) {
                  return {
                    warehouse: wh,
                    floor: fl,
                    zone: zn,
                    rack: rk,
                    slot: sl,
                    locationPath: `${wh.name} > ${fl.name} > ${zn.name} > ${rk.name} > ${sl.name}`,
                  };
                }
              }
            }
            if (zn.directSlots) {
              const sl = zn.directSlots.find((s) => s.id === locationId);
              if (sl) {
                return {
                  warehouse: wh,
                  floor: fl,
                  zone: zn,
                  slot: sl,
                  locationPath: `${wh.name} > ${fl.name} > ${zn.name} > ${sl.name}`,
                };
              }
            }
          }
        }
      }
    }

    // 2. Search Direct-Zone Hierarchy (No Floor level)
    if (wh.directZones) {
      for (const zn of wh.directZones) {
        if (zn.racks) {
          for (const rk of zn.racks) {
            const sl = rk.slots.find((s) => s.id === locationId);
            if (sl) {
              return {
                warehouse: wh,
                zone: zn,
                rack: rk,
                slot: sl,
                locationPath: `${wh.name} > ${zn.name} > ${rk.name} > ${sl.name}`,
              };
            }
          }
        }
        if (zn.directSlots) {
          const sl = zn.directSlots.find((s) => s.id === locationId);
          if (sl) {
            return {
              warehouse: wh,
              zone: zn,
              slot: sl,
              locationPath: `${wh.name} > ${zn.name} > ${sl.name}`,
            };
          }
        }
      }
    }
  }

  return null;
}
