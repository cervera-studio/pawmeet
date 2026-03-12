import {
  GROUP_EVENT_DESCRIPTION_MAX_LENGTH,
  GROUP_EVENT_MAX_PARTICIPANTS,
  GROUP_EVENT_MIN_PARTICIPANTS,
  GROUP_EVENT_TITLE_MAX_LENGTH,
  MAX_SEARCH_RADIUS_KM,
  MIN_SEARCH_RADIUS_KM,
  WALK_DURATION_MAX,
  WALK_DURATION_MIN,
} from '@pawmeet/config';
import { z } from 'zod';

export const createGroupEventSchema = z.object({
  title: z.string().min(1).max(GROUP_EVENT_TITLE_MAX_LENGTH),
  description: z.string().max(GROUP_EVENT_DESCRIPTION_MAX_LENGTH).optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(WALK_DURATION_MIN).max(WALK_DURATION_MAX).default(60),
  location: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  maxParticipants: z
    .number()
    .int()
    .min(GROUP_EVENT_MIN_PARTICIPANTS)
    .max(GROUP_EVENT_MAX_PARTICIPANTS)
    .default(10),
  visibility: z.enum(['public', 'friends_only', 'invite_only']).default('public'),
  category: z.enum(['walk', 'meetup', 'training']).default('walk'),
  requiresApproval: z.boolean().default(false),
  dogId: z.string().uuid(),
  coverImageUrl: z.string().url().max(500).optional(),
});

export const createRecurringEventSchema = z.object({
  title: z.string().min(1).max(GROUP_EVENT_TITLE_MAX_LENGTH),
  description: z.string().max(GROUP_EVENT_DESCRIPTION_MAX_LENGTH).optional(),
  scheduledAt: z.string().datetime(),
  durationMin: z.number().int().min(WALK_DURATION_MIN).max(WALK_DURATION_MAX).default(60),
  location: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  maxParticipants: z
    .number()
    .int()
    .min(GROUP_EVENT_MIN_PARTICIPANTS)
    .max(GROUP_EVENT_MAX_PARTICIPANTS)
    .default(10),
  visibility: z.enum(['public', 'friends_only', 'invite_only']).default('public'),
  category: z.enum(['walk', 'meetup', 'training']).default('walk'),
  requiresApproval: z.boolean().default(false),
  dogId: z.string().uuid(),
  coverImageUrl: z.string().url().max(500).optional(),
  recurrenceRule: z.string().min(1).max(255),
  recurrenceEnd: z.string().datetime().optional(),
});

export const joinGroupEventSchema = z.object({
  eventId: z.string().uuid(),
  dogId: z.string().uuid(),
});

export const leaveGroupEventSchema = z.object({
  eventId: z.string().uuid(),
});

export const getGroupEventSchema = z.object({
  eventId: z.string().uuid(),
});

export const updateGroupEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().min(1).max(GROUP_EVENT_TITLE_MAX_LENGTH).optional(),
  description: z.string().max(GROUP_EVENT_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(WALK_DURATION_MIN).max(WALK_DURATION_MAX).optional(),
  location: z.string().min(1).max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxParticipants: z
    .number()
    .int()
    .min(GROUP_EVENT_MIN_PARTICIPANTS)
    .max(GROUP_EVENT_MAX_PARTICIPANTS)
    .optional(),
});

export const cancelGroupEventSchema = z.object({
  eventId: z.string().uuid(),
});

export const listNearbyEventsSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().min(MIN_SEARCH_RADIUS_KM).max(MAX_SEARCH_RADIUS_KM).default(10),
  limit: z.number().int().min(1).max(50).default(20),
});

export const requestJoinEventSchema = z.object({
  eventId: z.string().uuid(),
  dogId: z.string().uuid(),
});

export const approveParticipantSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const declineParticipantSchema = z.object({
  eventId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const cancelRequestSchema = z.object({
  eventId: z.string().uuid(),
});

export const listPendingRequestsSchema = z.object({
  eventId: z.string().uuid(),
});

export const listOccurrencesSchema = z.object({
  eventId: z.string().uuid(),
});

export type CreateGroupEventInput = z.infer<typeof createGroupEventSchema>;
export type CreateRecurringEventInput = z.infer<typeof createRecurringEventSchema>;
export type JoinGroupEventInput = z.infer<typeof joinGroupEventSchema>;
export type UpdateGroupEventInput = z.infer<typeof updateGroupEventSchema>;
export type ListNearbyEventsInput = z.infer<typeof listNearbyEventsSchema>;
