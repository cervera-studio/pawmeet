import { emergencyContacts, walkSafetyCheckins } from '@pawmeet/db';
import type { EmergencyContact, SafetyCheckinType, WalkSafetyCheckin } from '@pawmeet/types';
import { and, eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { EmergencyContactRepository } from '../ports/emergency-contact-repository.js';
import { firstRow, rowsAs } from './drizzle-helpers.js';

export class DrizzleEmergencyContactRepository implements EmergencyContactRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async create(
    userId: string,
    data: { name: string; phone: string; relationship?: string | null },
  ): Promise<EmergencyContact> {
    const rows = await this.db
      .insert(emergencyContacts)
      .values({ userId, name: data.name, phone: data.phone, relationship: data.relationship ?? null })
      .returning();
    return firstRow<EmergencyContact>(rows);
  }

  async findByUserId(userId: string): Promise<EmergencyContact[]> {
    const rows = await this.db
      .select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId));
    return rowsAs<EmergencyContact>(rows);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db
      .delete(emergencyContacts)
      .where(and(eq(emergencyContacts.id, id), eq(emergencyContacts.userId, userId)));
  }

  async createCheckin(data: {
    walkId: string;
    userId: string;
    type: SafetyCheckinType;
    latitude?: string | null;
    longitude?: string | null;
  }): Promise<WalkSafetyCheckin> {
    const rows = await this.db
      .insert(walkSafetyCheckins)
      .values({
        walkId: data.walkId,
        userId: data.userId,
        type: data.type,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      })
      .returning();
    return firstRow<WalkSafetyCheckin>(rows);
  }

  async findCheckinsByWalk(walkId: string): Promise<WalkSafetyCheckin[]> {
    const rows = await this.db
      .select()
      .from(walkSafetyCheckins)
      .where(eq(walkSafetyCheckins.walkId, walkId));
    return rowsAs<WalkSafetyCheckin>(rows);
  }
}
