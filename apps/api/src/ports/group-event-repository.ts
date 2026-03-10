import type { GroupEvent, GroupEventParticipant, GroupEventWithParticipants } from '@dogwalk/types';

export interface CreateGroupEventInput {
  createdBy: string;
  title: string;
  description?: string | null;
  scheduledAt: Date;
  durationMin: number;
  location: string;
  latitude: number;
  longitude: number;
  maxParticipants: number;
  visibility: 'public' | 'private';
}

export interface NearbyEventsQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
  excludeUserId?: string;
}

export interface GroupEventRepository {
  create(input: CreateGroupEventInput): Promise<GroupEvent>;
  findById(id: string): Promise<GroupEvent | null>;
  findByIdWithParticipants(id: string): Promise<GroupEventWithParticipants | null>;
  findNearby(query: NearbyEventsQuery): Promise<(GroupEvent & { distanceKm: number })[]>;
  findByCreator(userId: string): Promise<GroupEvent[]>;
  findByParticipant(userId: string): Promise<GroupEvent[]>;
  update(id: string, data: Partial<CreateGroupEventInput>): Promise<GroupEvent>;
  updateStatus(id: string, status: string): Promise<void>;
  findScheduledPastStart(): Promise<GroupEvent[]>;
  findInProgressPastEnd(): Promise<GroupEvent[]>;

  // Participants
  addParticipant(input: {
    eventId: string;
    userId: string;
    dogId: string;
    status: 'accepted' | 'waitlisted';
    isOrganizer?: boolean;
  }): Promise<GroupEventParticipant>;
  findParticipant(eventId: string, userId: string): Promise<GroupEventParticipant | null>;
  removeParticipant(eventId: string, userId: string): Promise<void>;
  updateParticipantStatus(
    eventId: string,
    userId: string,
    status: 'accepted' | 'waitlisted' | 'declined',
  ): Promise<void>;
  countParticipants(eventId: string): Promise<number>;
  promoteFromWaitlist(eventId: string): Promise<GroupEventParticipant | null>;
}
