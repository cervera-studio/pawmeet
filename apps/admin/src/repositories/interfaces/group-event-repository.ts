import type { PaginatedResult } from '@pawmeet/types';

export interface AdminGroupEventListItem {
  id: string;
  title: string;
  category: string;
  visibility: string;
  status: string;
  scheduledAt: string;
  location: string;
  maxParticipants: number;
  requiresApproval: boolean;
  participantCount: number;
  pendingCount: number;
  createdAt: string;
  creatorName: string | null;
  creatorId: string;
  isRecurring: boolean;
}

export interface AdminGroupEventDetail extends AdminGroupEventListItem {
  description: string | null;
  durationMin: number;
  latitude: number;
  longitude: number;
  recurrenceRule: string | null;
  recurrenceEnd: string | null;
  parentEventId: string | null;
  coverImageUrl: string | null;
  updatedAt: string;
  participants: AdminEventParticipant[];
}

export interface AdminEventParticipant {
  id: string;
  userId: string;
  userName: string | null;
  dogId: string;
  dogName: string | null;
  status: string;
  isOrganizer: boolean;
  joinedAt: string;
}

export interface ListGroupEventsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'template';
  category?: 'walk' | 'meetup' | 'training';
}

export interface AdminGroupEventRepository {
  list(params: ListGroupEventsParams): Promise<PaginatedResult<AdminGroupEventListItem>>;
  getById(id: string): Promise<AdminGroupEventDetail>;
}
