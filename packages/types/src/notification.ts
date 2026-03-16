export interface NotificationLogEntry {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: Date | null;
  createdAt: Date;
}
