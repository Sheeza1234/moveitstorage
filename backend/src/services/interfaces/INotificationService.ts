import { OperationalNotification, NotificationSummary } from "@/types";

export interface INotificationService {
  getNotifications(filter?: {
    severity?: string;
    readStatus?: 'ALL' | 'UNREAD' | 'READ';
    search?: string;
  }): Promise<OperationalNotification[]>;

  getUnreadNotifications(): Promise<OperationalNotification[]>;

  getNotificationById(id: string): Promise<OperationalNotification | null>;

  markAsRead(id: string): Promise<OperationalNotification>;

  markAllAsRead(): Promise<void>;

  getUnreadCount(): Promise<number>;

  getNotificationSummary(): Promise<NotificationSummary>;

  evaluateOperationalAlerts(): Promise<OperationalNotification[]>;

  addNotification(notification: Partial<OperationalNotification>): Promise<OperationalNotification>;
}
