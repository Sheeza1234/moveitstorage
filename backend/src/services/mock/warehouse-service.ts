import { IWarehouseService, WarehouseCapacitySummary } from "../interfaces/IWarehouseService";
import {
  Warehouse,
  CreateWarehouseInput,
  Floor,
  Zone,
  Rack,
  WarehouseSlot,
  FloorInput,
  ZoneInput,
  RackInput,
  SlotInput,
  SlotUpdate,
  PermissionAction,
  hasPermission,
} from "@/types";
import type { WarehouseLayoutConfig } from "@/lib/utils/warehouse-visual-adapter";
import { MOCK_WAREHOUSES, MOCK_ALLOCATIONS, MOCK_INVENTORY_RECORDS } from "./mock-db";
import { getRequestRole } from "@/server/request-context";
import { PermissionError } from "@/server/errors";
import {
  allZones,
  locateFloor,
  locateRack,
  locateSlot,
  locateZone,
  pad2,
  rollup,
  uid,
  warehouseSlots,
  zoneSlots,
} from "./warehouse-structure";
import { calculateLocationCapacity } from "@/lib/utils/capacity";
import { auditService } from "./audit-service";

export class MockWarehouseService implements IWarehouseService {
  // The SHARED list (not a copy): allocation, inventory and AI-recommendation services resolve locations in
  // MOCK_WAREHOUSES, so warehouses created from the portal must live in that same array to be usable by them.
  private warehouses: Warehouse[] = MOCK_WAREHOUSES;
  private layouts: { id: string; groups: WarehouseLayoutConfig }[] = [];

  /** Server-side authorization with the existing WAREHOUSES permissions. */
  private authorize(action: PermissionAction) {
    const role = getRequestRole();
    if (!hasPermission(role, "WAREHOUSES", action)) {
      throw new PermissionError(`Your role (${role.replace(/_/g, " ").toLowerCase()}) is not allowed to ${action.toLowerCase()} warehouse structure.`);
    }
  }

  private fresh(w: Warehouse): Warehouse {
    if (w.structureManaged) rollup(w);
    return { ...w };
  }

  async getWarehouses(): Promise<Warehouse[]> {
    return this.warehouses.map((w) => this.fresh(w));
  }

  async getWarehouseById(id: string): Promise<Warehouse | null> {
    const wh = this.warehouses.find((w) => w.id === id);
    return wh ? this.fresh(wh) : null;
  }

  async createWarehouse(input: CreateWarehouseInput): Promise<Warehouse> {
    this.authorize("CREATE");
    const existingCode = this.warehouses.some(
      (w) => w.code.toUpperCase() === input.code.toUpperCase()
    );
    if (existingCode) {
      throw new Error(`Warehouse code '${input.code}' is already in use.`);
    }

    const { totalSqFt, availableSqFt, utilizationPercentage } =
      calculateLocationCapacity(input.totalCapacitySqFt, 0, 0);

    const id = `wh-${Date.now()}`;
    const code = input.code.toUpperCase();
    const newWarehouse: Warehouse = {
      id,
      code,
      name: input.name,
      address: input.address,
      location: `${input.city}, ${input.country}`,
      city: input.city,
      country: input.country,
      description: input.description || "",
      capacityUnit: input.capacityUnit,
      totalCapacitySqFt: totalSqFt,
      occupiedSqFt: 0,
      reservedSqFt: 0,
      availableSqFt: availableSqFt,
      utilizationPercentage,
      status: input.status,
      activeAllocationsCount: 0,
      // every new warehouse starts with its Ground Floor; more floors are added from the portal
      floors: [{ id: uid("fl"), code: `${code}-GF`, name: "Ground Floor", warehouseId: id, zones: [] }],
      floorsCount: 1,
      structureManaged: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.warehouses.unshift(newWarehouse);
    await auditService.recordEvent({
      entityType: "WAREHOUSE",
      entityId: newWarehouse.id,
      action: "WAREHOUSE_CREATED",
      description: `New warehouse facility '${newWarehouse.name}' (${newWarehouse.code}) created with ${newWarehouse.totalCapacitySqFt} SQ.FT capacity.`,
      performedBy: "Admin User",
      metadata: { code: newWarehouse.code, totalCapacitySqFt: newWarehouse.totalCapacitySqFt },
    });
    return { ...newWarehouse };
  }

  async updateWarehouse(id: string, input: Partial<CreateWarehouseInput>): Promise<Warehouse> {
    this.authorize("EDIT");
    const index = this.warehouses.findIndex((w) => w.id === id);
    if (index === -1) {
      throw new Error("Warehouse not found.");
    }

    const current = this.warehouses[index];

    if (input.code && input.code.toUpperCase() !== current.code) {
      const codeExists = this.warehouses.some(
        (w) => w.id !== id && w.code.toUpperCase() === input.code!.toUpperCase()
      );
      if (codeExists) {
        throw new Error(`Warehouse code '${input.code}' is already taken.`);
      }
    }

    const totalCapacity = input.totalCapacitySqFt ?? current.totalCapacitySqFt;
    const { availableSqFt, utilizationPercentage } = calculateLocationCapacity(
      totalCapacity,
      current.occupiedSqFt,
      current.reservedSqFt
    );

    const updated: Warehouse = {
      ...current,
      name: input.name ?? current.name,
      code: input.code ? input.code.toUpperCase() : current.code,
      address: input.address ?? current.address,
      city: input.city ?? current.city,
      country: input.country ?? current.country,
      location: `${input.city ?? current.city}, ${input.country ?? current.country}`,
      description: input.description ?? current.description,
      capacityUnit: input.capacityUnit ?? current.capacityUnit,
      totalCapacitySqFt: totalCapacity,
      availableSqFt,
      utilizationPercentage,
      status: input.status ?? current.status,
      updatedAt: new Date().toISOString(),
    };

    this.warehouses[index] = updated;
    await auditService.recordEvent({
      entityType: "WAREHOUSE",
      entityId: updated.id,
      action: "WAREHOUSE_UPDATED",
      description: `Warehouse facility '${updated.name}' (${updated.code}) configuration updated.`,
      performedBy: "Admin User",
      metadata: { previousValue: current.status, newValue: updated.status, name: updated.name },
    });
    return { ...updated };
  }

  async getWarehouseCapacitySummary(): Promise<WarehouseCapacitySummary> {
    const totalWarehouses = this.warehouses.length;
    const activeWarehouses = this.warehouses.filter((w) => w.status === "ACTIVE").length;

    let totalCapacitySqFt = 0;
    let occupiedSqFt = 0;
    let reservedSqFt = 0;

    for (const w of this.warehouses) {
      totalCapacitySqFt += w.totalCapacitySqFt;
      occupiedSqFt += w.occupiedSqFt;
      reservedSqFt += w.reservedSqFt;
    }

    const { availableSqFt, utilizationPercentage } = calculateLocationCapacity(
      totalCapacitySqFt,
      occupiedSqFt,
      reservedSqFt
    );

    return {
      totalWarehouses,
      activeWarehouses,
      totalCapacitySqFt,
      occupiedSqFt,
      reservedSqFt,
      availableSqFt,
      utilizationPercentage,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Portal-managed structure                                            */
  /* ------------------------------------------------------------------ */

  private warehouse(id: string): Warehouse {
    const w = this.warehouses.find((x) => x.id === id);
    if (!w) throw new Error("Warehouse not found.");
    return w;
  }

  private async commit(w: Warehouse, description: string, entityId: string): Promise<Warehouse> {
    w.structureManaged = true;
    rollup(w);
    await auditService.recordEvent({
      entityType: "WAREHOUSE",
      entityId,
      action: "WAREHOUSE_UPDATED",
      description,
      performedBy: getRequestRole().replace(/_/g, " "),
      metadata: { warehouseId: w.id },
    });
    return { ...w };
  }

  private requireText(value: string | undefined, label: string): string {
    const v = (value ?? "").trim();
    if (!v) throw new Error(`${label} is required.`);
    return v;
  }

  private requirePositive(value: number, label: string, max = 1_000_000) {
    if (!Number.isFinite(value) || value <= 0 || value > max) throw new Error(`${label} must be a number between 1 and ${max.toLocaleString()}.`);
  }

  /** A position in use must never disappear: occupied / reserved space, an allocation or stored inventory blocks removal. */
  private slotInUse(slot: WarehouseSlot): string | null {
    if (slot.occupiedCapacitySqFt > 0 || slot.reservedCapacitySqFt > 0) return `${slot.code} holds occupied or reserved capacity`;
    if (slot.currentAllocationId) return `${slot.code} is linked to an allocation`;
    if (MOCK_ALLOCATIONS.some((a) => a.locationId === slot.id && !["RELEASED", "CANCELLED"].includes(a.status))) return `${slot.code} has an active allocation`;
    if (MOCK_INVENTORY_RECORDS.some((r) => r.locationId === slot.id && !["RELEASED", "DISPOSED", "LOST"].includes(r.status))) return `${slot.code} stores inventory`;
    return null;
  }

  private assertRemovable(slots: WarehouseSlot[], what: string) {
    for (const s of slots) {
      const reason = this.slotInUse(s);
      if (reason) throw new Error(`Cannot delete ${what}: ${reason}.`);
    }
  }

  private codeTaken(w: Warehouse, code: string, ignoreId?: string): { floor?: boolean; zone?: boolean; rack?: boolean; slot?: boolean } {
    const c = code.trim().toUpperCase();
    const same = (x: string, id: string) => x.toUpperCase() === c && id !== ignoreId;
    return {
      floor: (w.floors ?? []).some((f) => same(f.code, f.id)),
      zone: allZones(w).some(({ zone }) => same(zone.code, zone.id)),
      rack: allZones(w).some(({ zone }) => (zone.racks ?? []).some((r) => same(r.code, r.id))),
      slot: warehouseSlots(w).some((s) => same(s.code, s.id)),
    };
  }

  async createFloor(warehouseId: string, input: FloorInput): Promise<Warehouse> {
    this.authorize("CREATE");
    const w = this.warehouse(warehouseId);
    const name = this.requireText(input.name, "Floor name");
    const code = this.requireText(input.code, "Floor code").toUpperCase();
    if ((w.directZones ?? []).length) throw new Error("This warehouse already uses zones without floors. Remove them before adding floors.");
    if (this.codeTaken(w, code).floor) throw new Error(`Floor code '${code}' is already used in this warehouse.`);
    const floor: Floor = { id: uid("fl"), code, name, warehouseId: w.id, zones: [] };
    w.floors = [...(w.floors ?? []), floor];
    return this.commit(w, `Floor '${name}' (${code}) added to ${w.name}.`, floor.id);
  }

  async updateFloor(floorId: string, input: Partial<FloorInput>): Promise<Warehouse> {
    this.authorize("EDIT");
    const hit = locateFloor(this.warehouses, floorId);
    if (!hit) throw new Error("Floor not found.");
    if (input.code !== undefined) {
      const code = this.requireText(input.code, "Floor code").toUpperCase();
      if (this.codeTaken(hit.warehouse, code, floorId).floor) throw new Error(`Floor code '${code}' is already used in this warehouse.`);
      hit.item.code = code;
    }
    if (input.name !== undefined) hit.item.name = this.requireText(input.name, "Floor name");
    return this.commit(hit.warehouse, `Floor '${hit.item.name}' updated.`, floorId);
  }

  async deleteFloor(floorId: string): Promise<Warehouse> {
    this.authorize("DELETE");
    const hit = locateFloor(this.warehouses, floorId);
    if (!hit) throw new Error("Floor not found.");
    if ((hit.warehouse.floors ?? []).length <= 1) throw new Error("A warehouse always keeps at least one floor, so the last floor cannot be deleted.");
    this.assertRemovable((hit.item.zones ?? []).flatMap(zoneSlots), `floor '${hit.item.name}'`);
    hit.warehouse.floors = (hit.warehouse.floors ?? []).filter((f) => f.id !== floorId);
    return this.commit(hit.warehouse, `Floor '${hit.item.name}' removed from ${hit.warehouse.name}.`, floorId);
  }

  async createZone(warehouseId: string, input: ZoneInput): Promise<Warehouse> {
    this.authorize("CREATE");
    const w = this.warehouse(warehouseId);
    const name = this.requireText(input.name, "Zone name");
    const code = this.requireText(input.code, "Zone code").toUpperCase();
    if (this.codeTaken(w, code).zone) throw new Error(`Zone code '${code}' is already used in this warehouse.`);
    if (input.capacitySqFt !== undefined) this.requirePositive(input.capacitySqFt, "Zone capacity");
    const zone: Zone = {
      id: uid("zn"),
      declaredCapacitySqFt: input.capacitySqFt,
      code,
      name,
      warehouseId: w.id,
      isOpenFloor: Boolean(input.isOpenFloor),
      racks: input.isOpenFloor ? undefined : [],
      directSlots: input.isOpenFloor ? [] : undefined,
    };
    if (input.floorId) {
      const floor = (w.floors ?? []).find((f) => f.id === input.floorId);
      if (!floor) throw new Error("Floor not found in this warehouse.");
      zone.floorId = floor.id;
      floor.zones = [...(floor.zones ?? []), zone];
    } else {
      if ((w.floors ?? []).length) throw new Error("This warehouse has floors. Choose the floor the zone belongs to.");
      w.directZones = [...(w.directZones ?? []), zone];
    }
    return this.commit(w, `Zone '${name}' (${code}) added to ${w.name}.`, zone.id);
  }

  /** SQ.FT of a zone's declared capacity that is not yet carved into usable racks / bays (undefined = no declared capacity). */
  private unassigned(zone: Zone, extra = 0): number | undefined {
    if (zone.declaredCapacitySqFt === undefined) return undefined;
    const carved = zoneSlots(zone).filter((s) => s.status !== "BLOCKED").reduce((t, s) => t + s.totalCapacitySqFt, 0);
    return zone.declaredCapacitySqFt - carved - extra;
  }

  private assertFits(zone: Zone, extra: number) {
    const left = this.unassigned(zone, extra);
    if (left !== undefined && left < 0) {
      const free = Math.max(0, (this.unassigned(zone) as number));
      throw new Error(`Zone '${zone.name}' only has ${free.toLocaleString()} SQ.FT of unassigned space (capacity ${zone.declaredCapacitySqFt?.toLocaleString()} SQ.FT). Increase the zone capacity or use less space.`);
    }
  }

  async updateZone(zoneId: string, input: Partial<Pick<ZoneInput, "name" | "code" | "capacitySqFt">>): Promise<Warehouse> {
    this.authorize("EDIT");
    const hit = locateZone(this.warehouses, zoneId);
    if (!hit) throw new Error("Zone not found.");
    if (input.capacitySqFt !== undefined) {
      this.requirePositive(input.capacitySqFt, "Zone capacity");
      const carved = zoneSlots(hit.item).filter((s) => s.status !== "BLOCKED").reduce((t, s) => t + s.totalCapacitySqFt, 0);
      if (input.capacitySqFt < carved) throw new Error(`Zone capacity cannot be lower than the ${carved.toLocaleString()} SQ.FT already assigned to racks and bays.`);
      hit.item.declaredCapacitySqFt = input.capacitySqFt;
    }
    if (input.code !== undefined) {
      const code = this.requireText(input.code, "Zone code").toUpperCase();
      if (this.codeTaken(hit.warehouse, code, zoneId).zone) throw new Error(`Zone code '${code}' is already used in this warehouse.`);
      hit.item.code = code;
    }
    if (input.name !== undefined) hit.item.name = this.requireText(input.name, "Zone name");
    return this.commit(hit.warehouse, `Zone '${hit.item.name}' updated.`, zoneId);
  }

  async deleteZone(zoneId: string): Promise<Warehouse> {
    this.authorize("DELETE");
    const hit = locateZone(this.warehouses, zoneId);
    if (!hit) throw new Error("Zone not found.");
    this.assertRemovable(zoneSlots(hit.item), `zone '${hit.item.name}'`);
    if (hit.floor) hit.floor.zones = (hit.floor.zones ?? []).filter((z) => z.id !== zoneId);
    else hit.warehouse.directZones = (hit.warehouse.directZones ?? []).filter((z) => z.id !== zoneId);
    return this.commit(hit.warehouse, `Zone '${hit.item.name}' removed from ${hit.warehouse.name}.`, zoneId);
  }

  async createRack(zoneId: string, input: RackInput): Promise<Warehouse> {
    this.authorize("CREATE");
    const hit = locateZone(this.warehouses, zoneId);
    if (!hit) throw new Error("Zone not found.");
    const { warehouse: w, item: zone, floor } = hit;
    if (zone.isOpenFloor) throw new Error("Open-floor zones hold storage bays, not racks.");
    const name = this.requireText(input.name, "Rack name");
    const code = this.requireText(input.code, "Rack code").toUpperCase();
    this.requirePositive(input.levels, "Levels", 12);
    this.requirePositive(input.positionsPerLevel, "Positions per level", 30);
    this.requirePositive(input.positionCapacitySqFt, "Position capacity");
    this.assertFits(zone, input.levels * input.positionsPerLevel * input.positionCapacitySqFt);
    const rowLabel = (input.rowLabel ?? "").trim().toUpperCase();
    if (rowLabel && !/^[A-Z0-9]{1,3}$/.test(rowLabel)) throw new Error("Row must be 1-3 letters or digits, e.g. A.");
    if (this.codeTaken(w, code).rack) throw new Error(`Rack code '${code}' is already used in this warehouse.`);

    const rackId = uid("rk");
    const slots: WarehouseSlot[] = [];
    for (let l = 1; l <= input.levels; l++) {
      for (let p = 1; p <= input.positionsPerLevel; p++) {
        const slotCode = `${code}-L${l}-P${pad2(p)}`;
        if (this.codeTaken(w, slotCode).slot) throw new Error(`Position code '${slotCode}' is already used in this warehouse.`);
        slots.push({
          id: uid("slot"),
          code: slotCode,
          name: `Position L${l}-P${pad2(p)}`,
          shelfId: `L${l}`,
          rackId,
          zoneId: zone.id,
          floorId: floor?.id,
          warehouseId: w.id,
          storageType: "SLOT",
          totalCapacitySqFt: input.positionCapacitySqFt,
          occupiedCapacitySqFt: 0,
          reservedCapacitySqFt: 0,
          availableCapacitySqFt: input.positionCapacitySqFt,
          status: "AVAILABLE",
        });
      }
    }
    const rack: Rack = { id: rackId, code, name, zoneId: zone.id, rowLabel: rowLabel || undefined, slots };
    zone.racks = [...(zone.racks ?? []), rack];
    return this.commit(w, `Rack '${name}' (${code}) with ${slots.length} positions added to ${zone.name}.`, rackId);
  }

  async updateRack(rackId: string, input: Partial<Pick<RackInput, "name" | "code" | "rowLabel">>): Promise<Warehouse> {
    this.authorize("EDIT");
    const hit = locateRack(this.warehouses, rackId);
    if (!hit) throw new Error("Rack not found.");
    if (input.code !== undefined) {
      const code = this.requireText(input.code, "Rack code").toUpperCase();
      if (this.codeTaken(hit.warehouse, code, rackId).rack) throw new Error(`Rack code '${code}' is already used in this warehouse.`);
      hit.item.code = code;
    }
    if (input.name !== undefined) hit.item.name = this.requireText(input.name, "Rack name");
    if (input.rowLabel !== undefined) {
      const row = input.rowLabel.trim().toUpperCase();
      if (row && !/^[A-Z0-9]{1,3}$/.test(row)) throw new Error("Row must be 1-3 letters or digits, e.g. A.");
      hit.item.rowLabel = row || undefined;
    }
    return this.commit(hit.warehouse, `Rack '${hit.item.name}' updated.`, rackId);
  }

  async deleteRack(rackId: string): Promise<Warehouse> {
    this.authorize("DELETE");
    const hit = locateRack(this.warehouses, rackId);
    if (!hit || !hit.zone) throw new Error("Rack not found.");
    this.assertRemovable(hit.item.slots ?? [], `rack '${hit.item.name}'`);
    hit.zone.racks = (hit.zone.racks ?? []).filter((r) => r.id !== rackId);
    return this.commit(hit.warehouse, `Rack '${hit.item.name}' removed from ${hit.zone.name}.`, rackId);
  }

  async createSlot(parentId: string, input: SlotInput): Promise<Warehouse> {
    this.authorize("CREATE");
    const name = this.requireText(input.name, "Position name");
    const code = this.requireText(input.code, "Position code").toUpperCase();
    this.requirePositive(input.capacitySqFt, "Capacity");

    const rackHit = locateRack(this.warehouses, parentId);
    const zoneHit = rackHit ? undefined : locateZone(this.warehouses, parentId);
    const w = rackHit?.warehouse ?? zoneHit?.warehouse;
    if (!w) throw new Error("Rack or open-floor zone not found.");
    if (this.codeTaken(w, code).slot) throw new Error(`Position code '${code}' is already used in this warehouse.`);

    const zone = rackHit ? rackHit.zone! : zoneHit!.item;
    const floor = rackHit ? rackHit.floor : zoneHit!.floor;
    this.assertFits(zone, input.capacitySqFt);
    // Free space (a bay of N SQ.FT) can be carved from an open-floor zone or from any zone that has a declared capacity.
    if (!rackHit && !zone.isOpenFloor && zone.declaredCapacitySqFt === undefined) {
      throw new Error("Give the zone a capacity (SQ.FT) first, or add the position to a rack.");
    }

    const slot: WarehouseSlot = {
      id: uid("slot"),
      code,
      name,
      rackId: rackHit?.item.id,
      zoneId: zone.id,
      floorId: floor?.id,
      warehouseId: w.id,
      storageType: input.storageType ?? (rackHit ? "SLOT" : "FLOOR"),
      totalCapacitySqFt: input.capacitySqFt,
      occupiedCapacitySqFt: 0,
      reservedCapacitySqFt: 0,
      availableCapacitySqFt: input.capacitySqFt,
      status: "AVAILABLE",
    };
    if (rackHit) {
      const levels = (rackHit.item.slots ?? []).map((s) => s.shelfId).filter(Boolean) as string[];
      slot.shelfId = levels[levels.length - 1];
      rackHit.item.slots = [...(rackHit.item.slots ?? []), slot];
    } else {
      zone.directSlots = [...(zone.directSlots ?? []), slot];
    }
    return this.commit(w, `Position '${code}' added to ${rackHit ? rackHit.item.name : zone.name}.`, slot.id);
  }

  async updateSlot(slotId: string, input: SlotUpdate): Promise<Warehouse> {
    this.authorize("EDIT");
    const hit = locateSlot(this.warehouses, slotId);
    if (!hit) throw new Error("Position not found.");
    const slot = hit.item;
    if (input.code !== undefined) {
      const code = this.requireText(input.code, "Position code").toUpperCase();
      if (this.codeTaken(hit.warehouse, code, slotId).slot) throw new Error(`Position code '${code}' is already used in this warehouse.`);
      slot.code = code;
    }
    if (input.name !== undefined) slot.name = this.requireText(input.name, "Position name");
    if (input.capacitySqFt !== undefined) {
      this.requirePositive(input.capacitySqFt, "Capacity");
      if (hit.zone && input.capacitySqFt > slot.totalCapacitySqFt) this.assertFits(hit.zone, input.capacitySqFt - slot.totalCapacitySqFt);
      if (input.capacitySqFt < slot.occupiedCapacitySqFt + slot.reservedCapacitySqFt) {
        throw new Error("Capacity cannot be lower than the space already occupied or reserved.");
      }
      slot.totalCapacitySqFt = input.capacitySqFt;
    }
    if (input.blocked !== undefined) {
      if (input.blocked && (slot.occupiedCapacitySqFt > 0 || slot.reservedCapacitySqFt > 0)) {
        throw new Error("A position that holds occupied or reserved capacity cannot be blocked.");
      }
      slot.status = input.blocked ? "BLOCKED" : "AVAILABLE";
    }
    const c = calculateLocationCapacity(slot.totalCapacitySqFt, slot.occupiedCapacitySqFt, slot.reservedCapacitySqFt, slot.status);
    slot.availableCapacitySqFt = slot.status === "BLOCKED" ? 0 : c.availableSqFt;
    if (slot.status !== "BLOCKED") slot.status = c.status;
    return this.commit(hit.warehouse, `Position '${slot.code}' updated.`, slotId);
  }

  async deleteSlot(slotId: string): Promise<Warehouse> {
    this.authorize("DELETE");
    const hit = locateSlot(this.warehouses, slotId);
    if (!hit) throw new Error("Position not found.");
    this.assertRemovable([hit.item], `position '${hit.item.code}'`);
    if (hit.rack) hit.rack.slots = (hit.rack.slots ?? []).filter((s) => s.id !== slotId);
    else if (hit.zone) hit.zone.directSlots = (hit.zone.directSlots ?? []).filter((s) => s.id !== slotId);
    return this.commit(hit.warehouse, `Position '${hit.item.code}' removed.`, slotId);
  }

  async getLayoutConfig(warehouseId: string): Promise<WarehouseLayoutConfig> {
    return JSON.parse(JSON.stringify(this.layouts.find((l) => l.id === warehouseId)?.groups ?? {}));
  }

  async saveLayoutConfig(warehouseId: string, config: WarehouseLayoutConfig): Promise<WarehouseLayoutConfig> {
    this.authorize("EDIT");
    this.warehouse(warehouseId);
    const clean: WarehouseLayoutConfig = {};
    for (const [group, rows] of Object.entries(config ?? {})) {
      const valid = (rows ?? [])
        .map((r) => ({
          racks: Math.round(Number(r.racks)),
          levels: Math.round(Number(r.levels)),
          positionsPerLevel: Math.round(Number(r.positionsPerLevel)),
        }))
        .filter((r) => r.racks >= 1 && r.racks <= 60 && r.levels >= 1 && r.levels <= 12 && r.positionsPerLevel >= 1 && r.positionsPerLevel <= 30);
      if (valid.length) clean[group] = valid;
    }
    const existing = this.layouts.find((l) => l.id === warehouseId);
    if (existing) existing.groups = clean;
    else this.layouts.push({ id: warehouseId, groups: clean });
    return JSON.parse(JSON.stringify(clean));
  }
}
