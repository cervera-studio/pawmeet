import { emergencyContacts, users, walkSafetyCheckins, walks } from '@pawmeet/db';
import { count, desc, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminEmergencyContactItem,
  AdminSafetyRepository,
  AdminSosAlertItem,
  PaginatedResult,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminSafetyRepository implements AdminSafetyRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listSosAlerts(input: {
    page: number;
    pageSize: number;
    type?: string;
  }): Promise<PaginatedResult<AdminSosAlertItem>> {
    const { page, pageSize, type } = input;
    const offset = (page - 1) * pageSize;

    const conditions = type ? eq(walkSafetyCheckins.type, type) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: walkSafetyCheckins.id,
          walkId: walkSafetyCheckins.walkId,
          userId: walkSafetyCheckins.userId,
          userName: users.displayName,
          type: walkSafetyCheckins.type,
          latitude: walkSafetyCheckins.latitude,
          longitude: walkSafetyCheckins.longitude,
          createdAt: walkSafetyCheckins.createdAt,
          walkTitle: walks.title,
          walkStatus: walks.status,
          walkScheduledAt: walks.scheduledAt,
        })
        .from(walkSafetyCheckins)
        .leftJoin(users, eq(walkSafetyCheckins.userId, users.id))
        .leftJoin(walks, eq(walkSafetyCheckins.walkId, walks.id))
        .where(conditions)
        .orderBy(desc(walkSafetyCheckins.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(walkSafetyCheckins).where(conditions),
    ]);

    return {
      data: items as AdminSosAlertItem[],
      total: totalRow?.value ?? 0,
    };
  }

  async listEmergencyContacts(input: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<PaginatedResult<AdminEmergencyContactItem>> {
    const { page, pageSize, search } = input;
    const offset = (page - 1) * pageSize;

    const searchCondition = search
      ? or(ilike(emergencyContacts.name, `%${search}%`), ilike(users.displayName, `%${search}%`))
      : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: emergencyContacts.id,
          userId: emergencyContacts.userId,
          userName: users.displayName,
          contactName: emergencyContacts.name,
          phone: emergencyContacts.phone,
          relationship: emergencyContacts.relationship,
          createdAt: emergencyContacts.createdAt,
        })
        .from(emergencyContacts)
        .leftJoin(users, eq(emergencyContacts.userId, users.id))
        .where(searchCondition)
        .orderBy(desc(emergencyContacts.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ value: count() })
        .from(emergencyContacts)
        .leftJoin(users, eq(emergencyContacts.userId, users.id))
        .where(searchCondition),
    ]);

    return {
      data: items as AdminEmergencyContactItem[],
      total: totalRow?.value ?? 0,
    };
  }
}
