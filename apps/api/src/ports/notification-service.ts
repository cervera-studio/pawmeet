export interface NotificationService {
  send(data: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void>;
}
