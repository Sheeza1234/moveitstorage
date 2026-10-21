import { IDashboardService } from "../interfaces/IDashboardService";
import { DashboardMetrics, Warehouse, OperationalAlert, MovementLog } from "@/types";
import { 
  MOCK_WAREHOUSES, 
  MOCK_ALERTS, 
  MOCK_MOVEMENTS,
  MOCK_CUSTOMERS,
  MOCK_ALLOCATIONS,
  MOCK_INVENTORY_RECORDS,
  MOCK_INVOICES,
  MOCK_CONTRACTS,
  MOCK_DOCUMENTS,
  MOCK_MOVEMENT_RECORDS
} from "./mock-db";

export class MockDashboardService implements IDashboardService {
  async getMetrics(warehouseId?: string): Promise<DashboardMetrics> {
    const totalCustomers = MOCK_CUSTOMERS.length;
    const activeStorageCustomers = MOCK_CUSTOMERS.filter((c) => c.status === "ACTIVE").length;

    const expiringContracts = MOCK_CONTRACTS.filter((c) => c.status === "EXPIRING_SOON").length;
    const expiringDocs = MOCK_DOCUMENTS.filter((d) => d.status === "EXPIRING_SOON").length;
    const expiredDocs = MOCK_DOCUMENTS.filter((d) => d.status === "EXPIRED").length;
    
    const pendingInvoices = MOCK_INVOICES.filter((i) => i.status === "ISSUED" || i.status === "PARTIALLY_PAID").length;
    const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === "OVERDUE").length;

    const pendingMovements = MOCK_MOVEMENT_RECORDS.filter(
      (m) =>
        m.status === "PENDING" &&
        (!warehouseId ||
          warehouseId === "ALL" ||
          m.fromWarehouseId === warehouseId ||
          m.toWarehouseId === warehouseId)
    ).length;

    const activeAllocationsCount = MOCK_ALLOCATIONS.filter((a) => a.status === "ACTIVE").length;
    const totalInventoryItemsCount = MOCK_INVENTORY_RECORDS
      .filter((i) => i.status === "IN_STORAGE" || i.status === "PARTIALLY_RELEASED")
      .reduce((sum, item) => sum + (item.itemCount - (item.releasedItemCount || 0)), 0);

    const relevantWarehouses = (!warehouseId || warehouseId === "ALL")
      ? MOCK_WAREHOUSES
      : MOCK_WAREHOUSES.filter((w) => w.id === warehouseId);

    const totalCap = relevantWarehouses.reduce((acc, w) => acc + (w.totalCapacitySqFt || 0), 0);
    const occupiedCap = relevantWarehouses.reduce((acc, w) => acc + (w.occupiedSqFt || 0), 0);
    const reservedCap = relevantWarehouses.reduce((acc, w) => acc + (w.reservedSqFt || 0), 0);
    const availableCap = relevantWarehouses.reduce((acc, w) => acc + (w.availableSqFt || 0), 0);

    const pct = totalCap > 0 ? Number((((occupiedCap + reservedCap) / totalCap) * 100).toFixed(1)) : 0;

    return {
      totalCustomers,
      activeStorageCustomers,
      totalCapacitySqFt: totalCap,
      occupiedCapacitySqFt: occupiedCap,
      reservedCapacitySqFt: reservedCap,
      availableCapacitySqFt: availableCap,
      occupancyPercentage: pct,
      activeAllocationsCount,
      totalInventoryItemsCount,
      expiringDocumentsCount: expiringDocs,
      expiredDocumentsCount: expiredDocs,
      expiringContractsCount: expiringContracts,
      pendingInvoicesCount: pendingInvoices,
      overdueInvoicesCount: overdueInvoices,
      pendingMovementsCount: pendingMovements,
    };
  }

  async getWarehousesOverview(): Promise<Warehouse[]> {
    return MOCK_WAREHOUSES;
  }

  async getRecentAlerts(): Promise<OperationalAlert[]> {
    return MOCK_ALERTS;
  }

  async getRecentMovements(): Promise<MovementLog[]> {
    return MOCK_MOVEMENTS;
  }
}
