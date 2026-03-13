import type { EmergencyContact, WalkSafetyCheckin, SafetyCheckinType } from '@pawmeet/types';

export interface EmergencyContactRepository {
  create(userId: string, data: { name: string; phone: string; relationship?: string | null }): Promise<EmergencyContact>;
  findByUserId(userId: string): Promise<EmergencyContact[]>;
  delete(id: string, userId: string): Promise<void>;
  createCheckin(data: {
    walkId: string;
    userId: string;
    type: SafetyCheckinType;
    latitude?: string | null;
    longitude?: string | null;
  }): Promise<WalkSafetyCheckin>;
  findCheckinsByWalk(walkId: string): Promise<WalkSafetyCheckin[]>;
}
