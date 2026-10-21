import { IMovementService, CreateMovementInput } from "../interfaces/IMovementService";
import { MovementRecord, MovementSummary } from "@/types";
import { MOCK_MOVEMENT_RECORDS } from "./mock-db";

export class MockMovementService implements IMovementService {
  private movements: MovementRecord[] = MOCK_MOVEMENT_RECORDS;

  async getMovements(): Promise<MovementRecord[]> {
    return [...this.movements];
  }

  async getMovementById(id: string): Promise<MovementRecord | null> {
    const mov = this.movements.find((m) => m.id === id);
    return mov ? { ...mov } : null;
  }

  async getInventoryMovements(inventoryId: string): Promise<MovementRecord[]> {
    return this.movements.filter((m) => m.inventoryId === inventoryId || m.packageId === inventoryId);
  }

  private generateMovementCode(): string {
    const highestNumber = this.movements.reduce((max, m) => {
      const match = m.movementCode?.match(/MOV-\d+-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 2);

    const nextNumber = highestNumber + 1;
    return `MOV-2026-${String(nextNumber).padStart(5, "0")}`;
  }

  async createMovement(input: CreateMovementInput): Promise<MovementRecord> {
    const code = this.generateMovementCode();

    const newMovement: MovementRecord = {
      id: `mov-${Date.now()}`,
      movementCode: code,
      inventoryId: input.inventoryId,
      packageId: input.packageId,
      packageCode: input.packageCode,
      customerId: input.customerId,
      customerName: input.customerName,
      allocationId: input.allocationId,
      fromWarehouseId: input.fromWarehouseId,
      fromWarehouseName: input.fromWarehouseName,
      fromLocationId: input.fromLocationId,
      fromLocationPath: input.fromLocationPath,
      toWarehouseId: input.toWarehouseId,
      toWarehouseName: input.toWarehouseName,
      toLocationId: input.toLocationId,
      toLocationPath: input.toLocationPath,
      movementType: input.movementType,
      quantity: input.quantity,
      reason: input.reason,
      performedBy: input.performedBy || "Operations Staff",
      timestamp: new Date().toISOString(),
      status: "COMPLETED",
      notes: input.notes,
    };

    this.movements.unshift(newMovement);
    return { ...newMovement };
  }

  async getMovementSummary(): Promise<MovementSummary> {
    const totalMovements = this.movements.length;
    const itemsInCount = this.movements.filter((m) => m.movementType === "IN").length;
    const itemsOutCount = this.movements.filter((m) => m.movementType === "OUT").length;
    const internalMovesCount = this.movements.filter((m) => m.movementType === "INTERNAL_MOVE" || m.movementType === "MOVE").length;

    return {
      totalMovements,
      itemsInCount,
      itemsOutCount,
      internalMovesCount,
    };
  }
}
