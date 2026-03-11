import { groupEventParticipants, groupEvents } from '@dogwalk/db';
import type { GroupEvent, GroupEventParticipant, GroupEventWithParticipants } from '@dogwalk/types';
import { and, desc, eq, lte, ne, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  CreateGroupEventInput,
  GroupEventRepository,
  NearbyEventsQuery,
} from '../ports/group-event-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleGroupEventRepository implements GroupEventRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async create(input: CreateGroupEventInput): Promise<GroupEvent> {
    const rows = await this.db.insert(groupEvents).values(input).returning();
    return firstRow<GroupEvent>(rows);
  }

  async findById(id: string): Promise<GroupEvent | null> {
    const rows = await this.db.select().from(groupEvents).where(eq(groupEvents.id, id));
    return firstRowOrNull<GroupEvent>(rows);
  }

  async findByIdWithParticipants(id: string): Promise<GroupEventWithParticipants | null> {
    const event = await this.findById(id);
    if (!event) return null;

    const participants = await this.db
      .select()
      .from(groupEventParticipants)
      .where(
        and(eq(groupEventParticipants.eventId, id), ne(groupEventParticipants.status, 'declined')),
      );

    return {
      ...event,
      participants: rowsAs<GroupEventParticipant>(participants),
      participantCount: participants.filter((p) => p.status === 'accepted').length,
    };
  }

  async findNearby(query: NearbyEventsQuery): Promise<(GroupEvent & { distanceKm: number })[]> {
    const { latitude, longitude, radiusKm, limit = 20, excludeUserId } = query;

    const distanceExpr = sql<number>`
      6371 * acos(
        cos(radians(${latitude})) * cos(radians(${groupEvents.latitude}))
        * cos(radians(${groupEvents.longitude}) - radians(${longitude}))
        + sin(radians(${latitude})) * sin(radians(${groupEvents.latitude}))
      )
    `;

    const conditions = [
      eq(groupEvents.visibility, 'public'),
      eq(groupEvents.status, 'scheduled'),
      sql`${groupEvents.scheduledAt} > now()`,
      sql`${distanceExpr} <= ${radiusKm}`,
    ];

    if (excludeUserId) {
      conditions.push(ne(groupEvents.createdBy, excludeUserId));
    }

    const rows = await this.db
      .select({
        id: groupEvents.id,
        createdBy: groupEvents.createdBy,
        title: groupEvents.title,
        description: groupEvents.description,
        scheduledAt: groupEvents.scheduledAt,
        durationMin: groupEvents.durationMin,
        location: groupEvents.location,
        latitude: groupEvents.latitude,
        longitude: groupEvents.longitude,
        maxParticipants: groupEvents.maxParticipants,
        visibility: groupEvents.visibility,
        status: groupEvents.status,
        createdAt: groupEvents.createdAt,
        updatedAt: groupEvents.updatedAt,
        distanceKm: distanceExpr,
      })
      .from(groupEvents)
      .where(and(...conditions))
      .orderBy(sql`${distanceExpr}`)
      .limit(limit);

    return rowsAs<GroupEvent & { distanceKm: number }>(rows);
  }

  async findByCreator(userId: string): Promise<GroupEvent[]> {
    const rows = await this.db
      .select()
      .from(groupEvents)
      .where(eq(groupEvents.createdBy, userId))
      .orderBy(desc(groupEvents.scheduledAt));
    return rowsAs<GroupEvent>(rows);
  }

  async findByParticipant(userId: string): Promise<GroupEvent[]> {
    const rows = await this.db
      .select({ event: groupEvents })
      .from(groupEventParticipants)
      .innerJoin(groupEvents, eq(groupEventParticipants.eventId, groupEvents.id))
      .where(
        and(
          eq(groupEventParticipants.userId, userId),
          eq(groupEventParticipants.status, 'accepted'),
        ),
      )
      .orderBy(desc(groupEvents.scheduledAt));
    return rowsAs<GroupEvent>(rows.map((r) => r.event));
  }

  async update(id: string, data: Partial<CreateGroupEventInput>): Promise<GroupEvent> {
    const rows = await this.db
      .update(groupEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groupEvents.id, id))
      .returning();
    return firstRow<GroupEvent>(rows);
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(groupEvents)
      .set({ status, updatedAt: new Date() })
      .where(eq(groupEvents.id, id));
  }

  async findScheduledPastStart(): Promise<GroupEvent[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(groupEvents)
      .where(and(eq(groupEvents.status, 'scheduled'), lte(groupEvents.scheduledAt, now)));
    return rowsAs<GroupEvent>(rows);
  }

  async findInProgressPastEnd(): Promise<GroupEvent[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(groupEvents)
      .where(
        and(
          eq(groupEvents.status, 'in_progress'),
          sql`${groupEvents.scheduledAt} + (${groupEvents.durationMin} || ' minutes')::interval <= ${now}`,
        ),
      );
    return rowsAs<GroupEvent>(rows);
  }

  // Participants

  async addParticipant(input: {
    eventId: string;
    userId: string;
    dogId: string;
    status: 'accepted' | 'waitlisted';
    isOrganizer?: boolean;
  }): Promise<GroupEventParticipant> {
    const rows = await this.db
      .insert(groupEventParticipants)
      .values({
        eventId: input.eventId,
        userId: input.userId,
        dogId: input.dogId,
        status: input.status,
        isOrganizer: input.isOrganizer ?? false,
      })
      .returning();
    return firstRow<GroupEventParticipant>(rows);
  }

  async findParticipant(eventId: string, userId: string): Promise<GroupEventParticipant | null> {
    const rows = await this.db
      .select()
      .from(groupEventParticipants)
      .where(
        and(eq(groupEventParticipants.eventId, eventId), eq(groupEventParticipants.userId, userId)),
      );
    return firstRowOrNull<GroupEventParticipant>(rows);
  }

  async removeParticipant(eventId: string, userId: string): Promise<void> {
    await this.db
      .delete(groupEventParticipants)
      .where(
        and(eq(groupEventParticipants.eventId, eventId), eq(groupEventParticipants.userId, userId)),
      );
  }

  async updateParticipantStatus(
    eventId: string,
    userId: string,
    status: 'accepted' | 'waitlisted' | 'declined',
  ): Promise<void> {
    await this.db
      .update(groupEventParticipants)
      .set({ status })
      .where(
        and(eq(groupEventParticipants.eventId, eventId), eq(groupEventParticipants.userId, userId)),
      );
  }

  async countParticipants(eventId: string): Promise<number> {
    const rows = await this.db
      .select({ id: groupEventParticipants.id })
      .from(groupEventParticipants)
      .where(
        and(
          eq(groupEventParticipants.eventId, eventId),
          eq(groupEventParticipants.status, 'accepted'),
        ),
      );
    return rows.length;
  }

  async promoteFromWaitlist(eventId: string): Promise<GroupEventParticipant | null> {
    // Find the earliest waitlisted participant
    const [waitlisted] = await this.db
      .select()
      .from(groupEventParticipants)
      .where(
        and(
          eq(groupEventParticipants.eventId, eventId),
          eq(groupEventParticipants.status, 'waitlisted'),
        ),
      )
      .orderBy(groupEventParticipants.joinedAt)
      .limit(1);

    if (!waitlisted) return null;

    await this.db
      .update(groupEventParticipants)
      .set({ status: 'accepted' })
      .where(eq(groupEventParticipants.id, waitlisted.id));

    return { ...waitlisted, status: 'accepted' } as GroupEventParticipant;
  }
}
