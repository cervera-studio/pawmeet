export const GROUP_EVENT_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type GroupEventStatus = (typeof GROUP_EVENT_STATUS)[keyof typeof GROUP_EVENT_STATUS];

export const GROUP_EVENT_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
} as const;

export type GroupEventVisibility =
  (typeof GROUP_EVENT_VISIBILITY)[keyof typeof GROUP_EVENT_VISIBILITY];

export const PARTICIPANT_STATUS = {
  ACCEPTED: 'accepted',
  WAITLISTED: 'waitlisted',
  DECLINED: 'declined',
} as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUS)[keyof typeof PARTICIPANT_STATUS];

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
