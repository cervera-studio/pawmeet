import type { GroupEvent, GroupEventParticipant, GroupEventWithParticipants } from '@pawmeet/types';

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
  visibility: 'public' | 'friends_only' | 'invite_only';
  category?: 'walk' | 'meetup' | 'training';
  requiresApproval?: boolean;
  recurrenceRule?: string | null;
  recurrenceEnd?: Date | null;
  parentEventId?: string | null;
  coverImageUrl?: string | null;
  organizationId?: string | null;
  isOfficial?: boolean;
  status?: string;
}

export interface NearbyEventsQuery {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
  excludeUserId?: string;
  friendUserIds?: string[];
  category?: 'walk' | 'meetup' | 'training';
}

export interface PendingParticipant {
  participant: GroupEventParticipant;
  displayName: string;
  avatarUrl: string | null;
  dogName: string;
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
  findFeatured(limit: number, offset: number): Promise<GroupEvent[]>;

  // Recurrence
  findTemplates(): Promise<GroupEvent[]>;
  findOccurrences(parentEventId: string): Promise<GroupEvent[]>;
  countActiveTemplates(userId: string): Promise<number>;

  // Participants
  addParticipant(input: {
    eventId: string;
    userId: string;
    dogId: string;
    status: 'pending' | 'accepted';
    isOrganizer?: boolean;
  }): Promise<GroupEventParticipant>;
  findParticipant(eventId: string, userId: string): Promise<GroupEventParticipant | null>;
  removeParticipant(eventId: string, userId: string): Promise<void>;
  updateParticipantStatus(
    eventId: string,
    userId: string,
    status: 'pending' | 'accepted' | 'declined' | 'removed' | 'cancelled',
  ): Promise<void>;
  countParticipants(eventId: string): Promise<number>;
  findPendingParticipants(eventId: string): Promise<PendingParticipant[]>;
  promoteFromWaitlist(eventId: string): Promise<GroupEventParticipant | null>;
}
