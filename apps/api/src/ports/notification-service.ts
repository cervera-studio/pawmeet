import type { PushNotificationData } from '@pawmeet/validation';

export interface NotificationService {
  send(data: {
    userId: string;
    title: string;
    body: string;
    data?: PushNotificationData;
  }): Promise<void>;
}
