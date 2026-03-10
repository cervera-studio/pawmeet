import { enqueueNotification } from '../jobs/queue.js';
import type { NotificationService } from '../ports/notification-service.js';

export class BullMQNotificationService implements NotificationService {
  async send(data: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    await enqueueNotification(data);
  }
}
