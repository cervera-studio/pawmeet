import { users } from '@pawmeet/db';
import { and, count, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminNotificationRepository,
  NotificationStats,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminNotificationRepository implements AdminNotificationRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async getActiveUsersWithPushToken(): Promise<{ id: string }[]> {
    return this.db
      .select({ id: users.id })
      .from(users)
      .where(and(isNotNull(users.pushToken), eq(users.isActive, true)));
  }

  async getTargetedUsers(userIds: string[]): Promise<{ id: string; pushToken: string | null }[]> {
    return this.db
      .select({ id: users.id, pushToken: users.pushToken })
      .from(users)
      .where(and(inArray(users.id, userIds), eq(users.isActive, true)));
  }

  async getNotificationStats(): Promise<NotificationStats> {
    const [totalRow] = await this.db.select({ value: count() }).from(users);
    const [tokenRow] = await this.db
      .select({ value: count() })
      .from(users)
      .where(isNotNull(users.pushToken));

    const [prefStats] = await this.db
      .select({
        matches: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'matches')::boolean = true THEN 1 END`,
        ),
        messages: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'messages')::boolean = true THEN 1 END`,
        ),
        reminders: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'reminders')::boolean = true THEN 1 END`,
        ),
        feed: count(
          sql`CASE WHEN (${users.notificationPrefs}->>'feed')::boolean = true THEN 1 END`,
        ),
      })
      .from(users)
      .where(eq(users.isActive, true));

    return {
      totalUsers: totalRow?.value ?? 0,
      usersWithToken: tokenRow?.value ?? 0,
      prefStats: {
        matches: prefStats?.matches ?? 0,
        messages: prefStats?.messages ?? 0,
        reminders: prefStats?.reminders ?? 0,
        feed: prefStats?.feed ?? 0,
      },
    };
  }
}
