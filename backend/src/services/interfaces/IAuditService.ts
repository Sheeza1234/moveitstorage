import { AuditEvent, AuditSummary } from "@/types";

export interface IAuditService {
  getAuditEvents(filter?: {
    entityType?: string;
    action?: string;
    search?: string;
  }): Promise<AuditEvent[]>;

  getAuditEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;

  recordEvent(input: {
    entityType: AuditEvent['entityType'];
    entityId: string;
    action: AuditEvent['action'];
    description: string;
    performedBy?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent>;

  getRecentActivity(limit?: number): Promise<AuditEvent[]>;

  getAuditSummary(): Promise<AuditSummary>;
}
