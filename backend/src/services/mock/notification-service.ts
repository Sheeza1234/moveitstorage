import { INotificationService } from "../interfaces/INotificationService";
import { OperationalNotification, NotificationSummary, AuditEntityType } from "@/types";


const SEED_NOTIFICATIONS: OperationalNotification[] = [
  {
    id: "notif-001",
    type: "CONTRACT_EXPIRING",
    title: "Contract Expiring Soon",
    message: "Storage Contract CNT-2026-002 (Global Cargo FZE) expires in 12 days.",
    severity: "WARNING",
    entityType: "CONTRACT",
    entityId: "cnt-02",
    read: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actionUrl: "/contracts/cnt-02",
    alertKey: "CONTRACT_EXPIRING:cnt-02",
  },
  {
    id: "notif-002",
    type: "INVOICE_OVERDUE",
    title: "Overdue Invoice Alert",
    message: "Invoice INV-2026-00003 (Apex Retailers) is overdue by 20 days. Amount: AED 26,250.00.",
    severity: "CRITICAL",
    entityType: "INVOICE",
    entityId: "inv-003",
    read: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    actionUrl: "/billing/inv-003",
    alertKey: "INVOICE_OVERDUE:inv-003",
  },
  {
    id: "notif-003",
    type: "DOCUMENT_EXPIRING",
    title: "Required Document Expiring",
    message: "Trade License Document DOC-2026-002 for Global Cargo FZE expires in 14 days.",
    severity: "WARNING",
    entityType: "DOCUMENT",
    entityId: "doc-02",
    read: false,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    actionUrl: "/contracts/cnt-02",
    alertKey: "DOCUMENT_EXPIRING:doc-02",
  },
  {
    id: "notif-004",
    type: "CAPACITY_WARNING",
    title: "High Warehouse Capacity Utilization",
    message: "Dubai Industrial City Hub (DIC-COLD) utilization reached 88.5% capacity.",
    severity: "WARNING",
    entityType: "WAREHOUSE",
    entityId: "wh-02",
    read: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    actionUrl: "/warehouses/wh-02",
    alertKey: "CAPACITY_WARNING:wh-02",
  },
  {
    id: "notif-005",
    type: "PAYMENT_RECEIVED",
    title: "Invoice Full Payment Received",
    message: "Full payment of AED 18,375.00 received for INV-2026-00001 (Emirates Logistics).",
    severity: "SUCCESS",
    entityType: "INVOICE",
    entityId: "inv-001",
    read: true,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    actionUrl: "/billing/inv-001",
    alertKey: "PAYMENT_RECEIVED:inv-001",
  },
];

export class MockNotificationService implements INotificationService {
  private notifications: OperationalNotification[] = [...SEED_NOTIFICATIONS];

  async getNotifications(filter?: {
    severity?: string;
    readStatus?: "ALL" | "UNREAD" | "READ";
    search?: string;
  }): Promise<OperationalNotification[]> {
    // Dynamically evaluate alerts first
    await this.evaluateOperationalAlerts();

    let result = [...this.notifications];

    if (filter?.severity && filter.severity !== "ALL") {
      result = result.filter((n) => n.severity === filter.severity);
    }

    if (filter?.readStatus === "UNREAD") {
      result = result.filter((n) => !n.read);
    } else if (filter?.readStatus === "READ") {
      result = result.filter((n) => n.read);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.entityId.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadNotifications(): Promise<OperationalNotification[]> {
    return this.getNotifications({ readStatus: "UNREAD" });
  }

  async getNotificationById(id: string): Promise<OperationalNotification | null> {
    const found = this.notifications.find((n) => n.id === id);
    return found ? { ...found } : null;
  }

  async markAsRead(id: string): Promise<OperationalNotification> {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) {
      throw new Error(`Notification "${id}" not found.`);
    }

    this.notifications[index].read = true;
    return { ...this.notifications[index] };
  }

  async markAllAsRead(): Promise<void> {
    this.notifications.splice(0, this.notifications.length, ...this.notifications.map((n) => ({ ...n, read: true })));
  }

  async getUnreadCount(): Promise<number> {
    await this.evaluateOperationalAlerts();
    return this.notifications.filter((n) => !n.read).length;
  }

  async getNotificationSummary(): Promise<NotificationSummary> {
    await this.evaluateOperationalAlerts();
    const total = this.notifications.length;
    const unread = this.notifications.filter((n) => !n.read).length;
    const critical = this.notifications.filter((n) => n.severity === "CRITICAL" || n.severity === "HIGH").length;
    const warnings = this.notifications.filter((n) => n.severity === "WARNING" || n.severity === "MEDIUM").length;
    const info = this.notifications.filter((n) => n.severity === "INFO" || n.severity === "LOW" || n.severity === "SUCCESS").length;

    return { total, unread, critical, warnings, info };
  }

  async evaluateOperationalAlerts(): Promise<OperationalNotification[]> {
    const { services } = await import("../index");
    const existingKeys = new Set(this.notifications.map((n) => n.alertKey).filter(Boolean));
    const now = new Date();

    // 1. Capacity evaluation
    try {
      const warehouses = await services.warehouseService.getWarehouses();
      for (const wh of warehouses) {
        if (wh.totalCapacitySqFt > 0) {
          const util = (wh.occupiedSqFt + wh.reservedSqFt) / wh.totalCapacitySqFt;
          const key = `CAPACITY_WARNING:${wh.id}`;

          if (util >= 0.95 && !existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "CAPACITY_FULL",
              title: "Warehouse Near Capacity Limit",
              message: `${wh.name} is operating at ${(util * 100).toFixed(1)}% occupied/reserved capacity.`,
              severity: "CRITICAL",
              entityType: "WAREHOUSE",
              entityId: wh.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: `/warehouses/${wh.id}`,
              alertKey: key,
            });
            existingKeys.add(key);
          } else if (util >= 0.85 && !existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "CAPACITY_WARNING",
              title: "High Warehouse Capacity Warning",
              message: `${wh.name} utilization is at ${(util * 100).toFixed(1)}% capacity.`,
              severity: "WARNING",
              entityType: "WAREHOUSE",
              entityId: wh.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: `/warehouses/${wh.id}`,
              alertKey: key,
            });
            existingKeys.add(key);
          }
        }
      }
    } catch {
      // Ignore background evaluation errors
    }

    // 2. Contract Evaluation
    try {
      const contracts = await services.contractService.getContracts();
      for (const cnt of contracts) {
        if (cnt.status === "EXPIRING_SOON") {
          const key = `CONTRACT_EXPIRING:${cnt.id}`;
          if (!existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "CONTRACT_EXPIRING",
              title: "Storage Contract Expiring Soon",
              message: `Contract ${cnt.contractCode} for ${cnt.customerName} expires on ${cnt.endDate}.`,
              severity: "WARNING",
              entityType: "CONTRACT",
              entityId: cnt.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: `/contracts/${cnt.id}`,
              alertKey: key,
            });
            existingKeys.add(key);
          }
        } else if (cnt.status === "EXPIRED") {
          const key = `CONTRACT_EXPIRED:${cnt.id}`;
          if (!existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "CONTRACT_EXPIRED",
              title: "Storage Contract Expired",
              message: `Contract ${cnt.contractCode} for ${cnt.customerName} has expired. Renewal required.`,
              severity: "CRITICAL",
              entityType: "CONTRACT",
              entityId: cnt.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: `/contracts/${cnt.id}`,
              alertKey: key,
            });
            existingKeys.add(key);
          }
        }
      }
    } catch {
      // Ignore background errors
    }

    // 3. Document Evaluation
    try {
      const documents = await services.documentService.getDocuments();
      for (const doc of documents) {
        if (doc.status === "REJECTED") {
          const key = `DOCUMENT_ISSUE:${doc.id}`;
          if (!existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "DOCUMENT_MISSING",
              title: "Document Rejected / Required",
              message: `${doc.title} for ${doc.customerName} was rejected. Compliance action required.`,
              severity: "CRITICAL",
              entityType: "DOCUMENT",
              entityId: doc.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: doc.contractId ? `/contracts/${doc.contractId}` : `/customers/${doc.customerId}`,
              alertKey: key,
            });
            existingKeys.add(key);
          }
        }
      }
    } catch {
      // Ignore background errors
    }

    // 4. Billing Evaluation
    try {
      const invoices = await services.billingService.getInvoices();
      for (const inv of invoices) {
        if (inv.status === "OVERDUE") {
          const key = `INVOICE_OVERDUE:${inv.id}`;
          if (!existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "INVOICE_OVERDUE",
              title: "Invoice Overdue Alert",
              message: `Invoice ${inv.invoiceNumber} (${inv.customerName}) is overdue. Balance due: AED ${inv.balanceDue.toLocaleString()}.`,
              severity: "CRITICAL",
              entityType: "INVOICE",
              entityId: inv.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: `/billing/${inv.id}`,
              alertKey: key,
            });
            existingKeys.add(key);
          }
        }
      }
    } catch {
      // Ignore background errors
    }

    // 5. Inventory Exceptions Evaluation
    try {
      const items = await services.inventoryService.getInventoryRecords();
      for (const item of items) {
        if (item.status === "DAMAGED") {
          const key = `INVENTORY_EXCEPTION:${item.id}`;
          if (!existingKeys.has(key)) {
            this.notifications.unshift({
              id: `notif-eval-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              type: "INVENTORY_EXCEPTION",
              title: `Inventory Item Damaged`,
              message: `Inventory item ${item.id} (${item.description}) marked as DAMAGED. Allocation: ${item.allocationCode || 'N/A'}.`,
              severity: "CRITICAL",
              entityType: "INVENTORY",
              entityId: item.id,
              read: false,
              createdAt: now.toISOString(),
              actionUrl: `/inventory/${item.id}`,
              alertKey: key,
            });
            existingKeys.add(key);
          }
        }
      }
    } catch {
      // Ignore background errors
    }

    return [...this.notifications];
  }

  async addNotification(input: Partial<OperationalNotification>): Promise<OperationalNotification> {
    const notif: OperationalNotification = {
      id: input.id || `notif-${Date.now()}`,
      type: input.type || "CAPACITY_WARNING",
      title: input.title || "Urgent Storage Review Required",
      message: input.message || "Quotation review required.",
      severity: input.severity || "CRITICAL",
      entityType: (input.entityType || "PACKING_LIST") as OperationalNotification["entityType"],
      entityId: input.entityId || "pl-001",
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: input.actionUrl || "/packing-lists",
      alertKey: input.alertKey || `PACKING_ALERT:${Date.now()}`,
    };

    this.notifications.unshift(notif);
    return { ...notif };
  }
}

export const notificationService = new MockNotificationService();
