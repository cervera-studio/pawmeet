export const GROUP_EVENT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  TEMPLATE: 'template',
} as const;

export type GroupEventStatus = (typeof GROUP_EVENT_STATUS)[keyof typeof GROUP_EVENT_STATUS];

export const GROUP_EVENT_VISIBILITY = {
  PUBLIC: 'public',
  FRIENDS_ONLY: 'friends_only',
  INVITE_ONLY: 'invite_only',
} as const;

export type GroupEventVisibility =
  (typeof GROUP_EVENT_VISIBILITY)[keyof typeof GROUP_EVENT_VISIBILITY];

export const PARTICIPANT_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  REMOVED: 'removed',
  CANCELLED: 'cancelled',
} as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUS)[keyof typeof PARTICIPANT_STATUS];

export const GROUP_EVENT_CATEGORY = {
  WALK: 'walk',
  MEETUP: 'meetup',
  TRAINING: 'training',
} as const;

export type GroupEventCategory = (typeof GROUP_EVENT_CATEGORY)[keyof typeof GROUP_EVENT_CATEGORY];

export interface GroupEvent {
  id: string;
  createdBy: string;
  title: string;
  description: string | null;
  scheduledAt: Date;
  durationMin: number;
  location: string;
  latitude: number;
  longitude: number;
  maxParticipants: number;
  visibility: GroupEventVisibility;
  status: GroupEventStatus;
  recurrenceRule: string | null;
  recurrenceEnd: Date | null;
  parentEventId: string | null;
  category: GroupEventCategory;
  requiresApproval: boolean;
  coverImageUrl: string | null;
  organizationId: string | null;
  isOfficial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupEventParticipant {
  id: string;
  eventId: string;
  userId: string;
  dogId: string;
  status: ParticipantStatus;
  isOrganizer: boolean;
  joinedAt: Date;
}

export interface GroupEventWithParticipants extends GroupEvent {
  participants: GroupEventParticipant[];
  participantCount: number;
}
