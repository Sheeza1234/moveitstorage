import { IAuditService } from "../interfaces/IAuditService";
import { AuditEvent, AuditSummary } from "@/types";

const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "aud-001",
    entityType: "CUSTOMER",
    entityId: "cust-01",
    action: "CUSTOMER_CREATED",
    description: "New customer profile created for Emirates Logistics Solutions LLC.",
    performedBy: "Admin User",
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { name: "Emirates Logistics Solutions LLC", code: "CUST-001" },
  },
  {
    id: "aud-002",
    entityType: "CONTRACT",
    entityId: "cnt-01",
    action: "CONTRACT_CREATED",
    description: "Storage Contract CNT-2026-001 generated for Emirates Logistics.",
    performedBy: "Admin User",
    timestamp: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { contractCode: "CNT-2026-001", rate: 5000 },
  },
  {
    id: "aud-003",
    entityType: "ALLOCATION",
    entityId: "alloc-01",
    action: "ALLOCATION_CONFIRMED",
    description: "Storage allocation ALLOC-2026-001 confirmed for 1,200 SQ.FT in DXB-MAIN.",
    performedBy: "Admin User",
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { allocatedSqFt: 1200, warehouseId: "wh-01" },
  },
  {
    id: "aud-004",
    entityType: "INVENTORY",
    entityId: "pkg-001",
    action: "INVENTORY_RECEIVED",
    description: "Received 500 Pallets of Heavy Equipment Parts (PKG-2026-0001).",
    performedBy: "Warehouse Operator",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { quantity: 500, unit: "Pallets" },
  },
  {
    id: "aud-005",
    entityType: "INVOICE",
    entityId: "inv-001",
    action: "INVOICE_ISSUED",
    description: "Storage Invoice INV-2026-00001 issued to Emirates Logistics (AED 18,375.00).",
    performedBy: "Finance Staff",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { totalAmount: 18375 },
  },
  {
    id: "aud-006",
    entityType: "INVOICE",
    entityId: "inv-001",
    action: "PAYMENT_RECORDED",
    description: "Payment of AED 18,375.00 recorded for INV-2026-00001 via Bank Transfer.",
    performedBy: "Finance Staff",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { amount: 18375, method: "BANK_TRANSFER" },
  },
  {
    id: "aud-007",
    entityType: "PORTAL",
    entityId: "cust-01",
    action: "PORTAL_SYNCED",
    description: "Synced customer storage & contract status with external customer portal.",
    performedBy: "System Integration",
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { recordsSynced: 4 },
  },
];

export class MockAuditService implements IAuditService {
  private events: AuditEvent[] = [...INITIAL_AUDIT_EVENTS];

  async getAuditEvents(filter?: {
    entityType?: string;
    action?: string;
    search?: string;
  }): Promise<AuditEvent[]> {
    let result = [...this.events];

    if (filter?.entityType && filter.entityType !== "ALL") {
      result = result.filter((e) => e.entityType === filter.entityType);
    }

    if (filter?.action && filter.action !== "ALL") {
      result = result.filter((e) => e.action === filter.action);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          e.entityId.toLowerCase().includes(q) ||
          e.performedBy.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAuditEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return this.events
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async recordEvent(input: {
    entityType: AuditEvent["entityType"];
    entityId: string;
    action: AuditEvent["action"];
    description: string;
    performedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      description: input.description,
      performedBy: input.performedBy || "Admin User",
      timestamp: new Date().toISOString(),
      metadata: input.metadata,
    };

    this.events.unshift(event);
    return { ...event };
  }

  async getRecentActivity(limit = 10): Promise<AuditEvent[]> {
    return this.events
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getAuditSummary(): Promise<AuditSummary> {
    const totalEvents = this.events.length;
    const today = new Date().toISOString().split("T")[0];
    const eventsToday = this.events.filter((e) => e.timestamp.startsWith(today)).length;
    const users = new Set(this.events.map((e) => e.performedBy)).size;

    const entityTypeBreakdown: Record<string, number> = {};
    for (const e of this.events) {
      entityTypeBreakdown[e.entityType] = (entityTypeBreakdown[e.entityType] || 0) + 1;
    }

    return {
      totalEvents,
      eventsToday,
      uniqueUsers: users,
      entityTypeBreakdown,
    };
  }
}

export const auditService = new MockAuditService();
