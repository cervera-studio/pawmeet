import {
  dogProfiles,
  eventSponsors,
  groupEventParticipants,
  groupEvents,
  organizations,
  users,
} from '@pawmeet/db';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type {
  AdminEventParticipant,
  AdminEventSponsorItem,
  AdminEventSponsorRow,
  AdminGroupEventDetail,
  AdminGroupEventItem,
  AdminGroupEventParticipantCount,
  AdminGroupEventRepository,
} from '../../ports/admin-data-repository.js';

export class DrizzleAdminGroupEventRepository implements AdminGroupEventRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listGroupEvents(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    category?: string;
  }): Promise<{
    items: AdminGroupEventItem[];
    total: number;
    participantCounts: AdminGroupEventParticipantCount[];
  }> {
    const { page, pageSize, search, status, category } = input;
    const offset = (page - 1) * pageSize;

    const conditions: (import('drizzle-orm').SQL | undefined)[] = [];
    if (search) conditions.push(ilike(groupEvents.title, `%${search}%`));
    if (status) conditions.push(eq(groupEvents.status, status));
    if (category) conditions.push(eq(groupEvents.category, category));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [totalRow]] = await Promise.all([
      this.db
        .select({
          id: groupEvents.id,
          title: groupEvents.title,
          category: groupEvents.category,
          visibility: groupEvents.visibility,
          status: groupEvents.status,
          scheduledAt: groupEvents.scheduledAt,
          location: groupEvents.location,
          maxParticipants: groupEvents.maxParticipants,
          requiresApproval: groupEvents.requiresApproval,
          createdAt: groupEvents.createdAt,
          creatorId: groupEvents.createdBy,
          creatorName: users.displayName,
          recurrenceRule: groupEvents.recurrenceRule,
          parentEventId: groupEvents.parentEventId,
        })
        .from(groupEvents)
        .leftJoin(users, eq(groupEvents.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(groupEvents.scheduledAt))
        .limit(pageSize)
        .offset(offset),
      this.db.select({ value: count() }).from(groupEvents).where(whereClause),
    ]);

    const eventIds = items.map((e) => e.id);
    const participantCounts =
      eventIds.length > 0
        ? await this.db
            .select({
              eventId: groupEventParticipants.eventId,
              status: groupEventParticipants.status,
              count: count(),
            })
            .from(groupEventParticipants)
            .where(or(...eventIds.map((eid) => eq(groupEventParticipants.eventId, eid))))
            .groupBy(groupEventParticipants.eventId, groupEventParticipants.status)
        : [];

    return {
      items: items as AdminGroupEventItem[],
      total: totalRow?.value ?? 0,
      participantCounts: participantCounts as AdminGroupEventParticipantCount[],
    };
  }

  async getGroupEvent(id: string): Promise<{
    event: AdminGroupEventDetail;
    participants: AdminEventParticipant[];
  } | null> {
    const [event] = await this.db
      .select({
        id: groupEvents.id,
        title: groupEvents.title,
        description: groupEvents.description,
        category: groupEvents.category,
        visibility: groupEvents.visibility,
        status: groupEvents.status,
        scheduledAt: groupEvents.scheduledAt,
        durationMin: groupEvents.durationMin,
        location: groupEvents.location,
        latitude: groupEvents.latitude,
        longitude: groupEvents.longitude,
        maxParticipants: groupEvents.maxParticipants,
        requiresApproval: groupEvents.requiresApproval,
        recurrenceRule: groupEvents.recurrenceRule,
        recurrenceEnd: groupEvents.recurrenceEnd,
        parentEventId: groupEvents.parentEventId,
        coverImageUrl: groupEvents.coverImageUrl,
        createdAt: groupEvents.createdAt,
        updatedAt: groupEvents.updatedAt,
        creatorId: groupEvents.createdBy,
        creatorName: users.displayName,
      })
      .from(groupEvents)
      .leftJoin(users, eq(groupEvents.createdBy, users.id))
      .where(eq(groupEvents.id, id));

    if (!event) return null;

    const participants = await this.db
      .select({
        id: groupEventParticipants.id,
        userId: groupEventParticipants.userId,
        userName: users.displayName,
        dogId: groupEventParticipants.dogId,
        dogName: dogProfiles.name,
        status: groupEventParticipants.status,
        isOrganizer: groupEventParticipants.isOrganizer,
        joinedAt: groupEventParticipants.joinedAt,
      })
      .from(groupEventParticipants)
      .leftJoin(users, eq(groupEventParticipants.userId, users.id))
      .leftJoin(dogProfiles, eq(groupEventParticipants.dogId, dogProfiles.id))
      .where(eq(groupEventParticipants.eventId, id))
      .orderBy(groupEventParticipants.joinedAt);

    return {
      event: event as AdminGroupEventDetail,
      participants: participants as AdminEventParticipant[],
    };
  }

  async findGroupEventById(id: string): Promise<{ id: string; status: string } | null> {
    const [event] = await this.db.select().from(groupEvents).where(eq(groupEvents.id, id));
    if (!event) return null;
    return { id: event.id, status: event.status };
  }

  async cancelGroupEvent(id: string): Promise<void> {
    await this.db
      .update(groupEvents)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(groupEvents.id, id));
  }

  async findParticipantById(id: string): Promise<{ id: string } | null> {
    const [participant] = await this.db
      .select()
      .from(groupEventParticipants)
      .where(eq(groupEventParticipants.id, id));
    if (!participant) return null;
    return { id: participant.id };
  }

  async removeParticipant(id: string): Promise<void> {
    await this.db
      .update(groupEventParticipants)
      .set({ status: 'removed' })
      .where(eq(groupEventParticipants.id, id));
  }

  async createOfficialEvent(input: {
    createdBy: string;
    title: string;
    description: string | null;
    scheduledAt: Date;
    durationMin: number;
    location: string;
    latitude: number;
    longitude: number;
    maxParticipants: number;
    category: string;
    coverImageUrl: string | null;
    organizationId: string;
  }): Promise<AdminGroupEventDetail> {
    const [event] = await this.db
      .insert(groupEvents)
      .values({
        createdBy: input.createdBy,
        title: input.title,
        description: input.description,
        scheduledAt: input.scheduledAt,
        durationMin: input.durationMin,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        maxParticipants: input.maxParticipants,
        visibility: 'public',
        status: 'scheduled',
        category: input.category,
        requiresApproval: false,
        coverImageUrl: input.coverImageUrl,
        organizationId: input.organizationId,
        isOfficial: true,
      })
      .returning();

    return { ...event, creatorId: input.createdBy, creatorName: null } as AdminGroupEventDetail;
  }

  async listEventSponsors(eventId: string): Promise<AdminEventSponsorItem[]> {
    const sponsors = await this.db
      .select({
        id: eventSponsors.id,
        eventId: eventSponsors.eventId,
        organizationId: eventSponsors.organizationId,
        tier: eventSponsors.tier,
        logoPlacement: eventSponsors.logoPlacement,
        createdAt: eventSponsors.createdAt,
        organizationName: organizations.name,
        organizationLogoUrl: organizations.logoUrl,
      })
      .from(eventSponsors)
      .innerJoin(organizations, eq(eventSponsors.organizationId, organizations.id))
      .where(eq(eventSponsors.eventId, eventId))
      .orderBy(eventSponsors.createdAt);

    return sponsors as AdminEventSponsorItem[];
  }

  async findEventSponsor(eventId: string, organizationId: string): Promise<{ id: string } | null> {
    const [existing] = await this.db
      .select()
      .from(eventSponsors)
      .where(
        and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.organizationId, organizationId)),
      );
    return existing ? { id: existing.id } : null;
  }

  async countEventSponsorsByTier(eventId: string, tier: string): Promise<number> {
    const [countRow] = await this.db
      .select({ value: count() })
      .from(eventSponsors)
      .where(and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.tier, tier)));
    return countRow?.value ?? 0;
  }

  async addEventSponsor(input: {
    eventId: string;
    organizationId: string;
    tier: string;
    logoPlacement: string;
  }): Promise<AdminEventSponsorRow> {
    const [sponsor] = await this.db.insert(eventSponsors).values(input).returning();
    return sponsor as AdminEventSponsorRow;
  }

  async removeEventSponsor(eventId: string, organizationId: string): Promise<void> {
    await this.db
      .delete(eventSponsors)
      .where(
        and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.organizationId, organizationId)),
      );
  }
}
