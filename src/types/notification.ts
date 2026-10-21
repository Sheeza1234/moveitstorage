export type NotificationType = 
  | 'CAPACITY_WARNING'
  | 'CAPACITY_FULL'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_EXPIRED'
  | 'DOCUMENT_EXPIRING'
  | 'DOCUMENT_EXPIRED'
  | 'DOCUMENT_MISSING'
  | 'INVOICE_DUE'
  | 'INVOICE_OVERDUE'
  | 'PAYMENT_RECEIVED'
  | 'INVENTORY_EXCEPTION'
  | 'SYSTEM_ALERT'
  | 'DOCUMENT_EXPIRY'
  | 'CONTRACT_EXPIRY'
  | 'STORAGE_EXPIRY'
  | 'SYSTEM_EVENT';

export type NotificationSeverity = 
  | 'CRITICAL' 
  | 'WARNING' 
  | 'INFO' 
  | 'SUCCESS' 
  | 'HIGH' 
  | 'MEDIUM' 
  | 'LOW';

// Legacy compatibility aliases
export type AlertSeverity = NotificationSeverity;
export type AlertType = NotificationType | string;

export interface OperationalNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  entityType: 'CUSTOMER' | 'DOCUMENT' | 'CONTRACT' | 'INVOICE' | 'WAREHOUSE' | 'ALLOCATION' | 'INVENTORY' | 'SYSTEM' | 'PACKING_LIST';
  entityId: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  alertKey?: string;
}

export type OperationalAlert = OperationalNotification;

export interface NotificationSummary {
  total: number;
  unread: number;
  critical: number;
  warnings: number;
  info: number;
}
