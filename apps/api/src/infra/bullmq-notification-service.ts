import type { PushNotificationData } from '@pawmeet/validation';
import { enqueueNotification } from '../jobs/queues/index.js';
import type { NotificationService } from '../ports/notification-service.js';

export class BullMQNotificationService implements NotificationService {
  async send(data: {
    userId: string;
    title: string;
    body: string;
    data?: PushNotificationData;
  }): Promise<void> {
    await enqueueNotification(data);
  }
}
