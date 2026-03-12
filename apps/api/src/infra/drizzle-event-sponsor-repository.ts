import { eventSponsors, organizations } from '@pawmeet/db';
import type { EventSponsor } from '@pawmeet/types';
import { and, count, eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  CreateEventSponsorInput,
  EventSponsorRepository,
} from '../ports/event-sponsor-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleEventSponsorRepository implements EventSponsorRepository {
  constructor(private db: NeonHttpDatabase) {}

  async add(input: CreateEventSponsorInput): Promise<EventSponsor> {
    const rows = await this.db.insert(eventSponsors).values(input).returning();
    return firstRow(rows);
  }

  async remove(eventId: string, organizationId: string): Promise<void> {
    await this.db
      .delete(eventSponsors)
      .where(
        and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.organizationId, organizationId)),
      );
  }

  async findByEvent(eventId: string): Promise<EventSponsor[]> {
    const rows = await this.db
      .select()
      .from(eventSponsors)
      .where(eq(eventSponsors.eventId, eventId))
      .orderBy(eventSponsors.createdAt);
    return rowsAs<EventSponsor>(rows);
  }

  async findByEventWithOrg(
    eventId: string,
  ): Promise<
    (EventSponsor & { organizationName: string; organizationLogoUrl: string | null })[]
  > {
    const rows = await this.db
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
    return rows as (EventSponsor & {
      organizationName: string;
      organizationLogoUrl: string | null;
    })[];
  }

  async countByEventAndTier(eventId: string, tier: string): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(eventSponsors)
      .where(and(eq(eventSponsors.eventId, eventId), eq(eventSponsors.tier, tier)));
    return row?.value ?? 0;
  }
}
