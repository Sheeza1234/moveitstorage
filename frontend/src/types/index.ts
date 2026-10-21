export * from "./customer";
export * from "./warehouse";
export * from "./allocation";
export * from "./inventory";
export * from "./contract";
export * from "./billing";
export * from "./portal";
export * from "./notification";
export * from "./audit";
export * from "./role";
export * from "./user";

export interface DashboardMetrics {
  totalCustomers: number;
  activeStorageCustomers: number;
  totalCapacitySqFt: number;
  occupiedCapacitySqFt: number;
  reservedCapacitySqFt: number;
  availableCapacitySqFt: number;
  occupancyPercentage: number;
  activeAllocationsCount: number;
  totalInventoryItemsCount: number;
  expiringDocumentsCount: number;
  expiredDocumentsCount: number;
  expiringContractsCount: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  pendingMovementsCount: number;
}
export * from "./booking-request";
