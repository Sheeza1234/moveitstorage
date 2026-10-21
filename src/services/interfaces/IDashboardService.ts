import { DashboardMetrics, Warehouse, OperationalAlert, MovementLog } from "@/types";

export interface IDashboardService {
  getMetrics(warehouseId?: string): Promise<DashboardMetrics>;
  getWarehousesOverview(): Promise<Warehouse[]>;
  getRecentAlerts(): Promise<OperationalAlert[]>;
  getRecentMovements(): Promise<MovementLog[]>;
}
