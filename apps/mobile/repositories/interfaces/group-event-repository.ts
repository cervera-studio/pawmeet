import type { GroupEvent, GroupEventWithParticipants, Serialized } from '@pawmeet/types';

export interface NearbyEventsParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
}

export interface CreateGroupEventInput {
  title: string;
  scheduledAt: string;
  location: string;
  latitude: number;
  longitude: number;
  dogId: string;
  description?: string;
  durationMin?: number;
  maxParticipants?: number;
  visibility?: 'public' | 'friends_only' | 'invite_only';
  category?: 'walk' | 'meetup' | 'training';
  requiresApproval?: boolean;
  coverImageUrl?: string;
}

export interface GroupEventRepository {
  listNearby(params: NearbyEventsParams): Promise<Serialized<GroupEvent>[]>;
  getById(eventId: string): Promise<Serialized<GroupEventWithParticipants>>;
  create(input: CreateGroupEventInput): Promise<Serialized<GroupEvent>>;
  join(eventId: string, dogId: string): Promise<void>;
  leave(eventId: string): Promise<void>;
  cancel(eventId: string): Promise<void>;
}
