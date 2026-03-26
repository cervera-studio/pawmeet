import {
  GROUP_EVENT_MAX_RECURRING_TEMPLATES,
  GROUP_EVENT_OCCURRENCES_AHEAD,
} from '@pawmeet/config';
import {
  AppError,
  fail,
  GROUP_EVENT_STATUS,
  type GroupEvent,
  type Result,
  succeed,
} from '@pawmeet/types';
import * as rruleLib from 'rrule';

const RRule = ('default' in rruleLib ? (rruleLib.default as typeof rruleLib) : rruleLib).RRule;

import type {
  DogRepository,
  GroupEventParticipationRepository,
  GroupEventRecurrenceRepository,
  GroupEventRepository,
} from '../ports/index.js';

type Deps = {
  groupEventRepo: Pick<GroupEventRepository, 'create'> &
    Pick<GroupEventParticipationRepository, 'addParticipant'> &
    Pick<GroupEventRecurrenceRepository, 'countActiveTemplates'>;
  dogRepo: DogRepository;
};

type CreateRecurringEventInput = {
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
  dogId: string;
  recurrenceRule: string;
  recurrenceEnd?: Date | null;
  coverImageUrl?: string | null;
};

export function createCreateRecurringEvent({ groupEventRepo, dogRepo }: Deps) {
  return async (
    userId: string,
    input: CreateRecurringEventInput,
  ): Promise<Result<{ template: GroupEvent; occurrences: GroupEvent[] }>> => {
    // Check template limit
    const activeCount = await groupEventRepo.countActiveTemplates(userId);
    if (activeCount >= GROUP_EVENT_MAX_RECURRING_TEMPLATES) {
      return fail(
        new AppError(
          'MAX_TEMPLATES_REACHED',
          `Puoi avere al massimo ${GROUP_EVENT_MAX_RECURRING_TEMPLATES} eventi ricorrenti attivi`,
          400,
        ),
      );
    }

    // Verify dog
    const dog = await dogRepo.findByIdAndOwner(input.dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog not found', 404));
    }

    // Create the template event
    const template = await groupEventRepo.create({
      createdBy: userId,
      title: input.title,
      description: input.description ?? null,
      scheduledAt: input.scheduledAt,
      durationMin: input.durationMin,
      location: input.location,
      latitude: input.latitude,
      longitude: input.longitude,
      maxParticipants: input.maxParticipants,
      visibility: input.visibility,
      category: input.category ?? 'walk',
      requiresApproval: input.requiresApproval ?? false,
      recurrenceRule: input.recurrenceRule,
      recurrenceEnd: input.recurrenceEnd ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      status: GROUP_EVENT_STATUS.TEMPLATE,
    });

    // Generate first N occurrences
    const rrule = RRule.fromString(input.recurrenceRule);
    const now = new Date();
    const dates = rrule.between(now, new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), true);
    const occurrenceDates = dates.slice(0, GROUP_EVENT_OCCURRENCES_AHEAD);

    const occurrences: GroupEvent[] = [];
    for (const date of occurrenceDates) {
      // Copy time from scheduledAt to the occurrence date
      const occurrenceDate = new Date(date);
      occurrenceDate.setUTCHours(
        input.scheduledAt.getUTCHours(),
        input.scheduledAt.getUTCMinutes(),
        0,
        0,
      );

      const occurrence = await groupEventRepo.create({
        createdBy: userId,
        title: input.title,
        description: input.description ?? null,
        scheduledAt: occurrenceDate,
        durationMin: input.durationMin,
        location: input.location,
        latitude: input.latitude,
        longitude: input.longitude,
        maxParticipants: input.maxParticipants,
        visibility: input.visibility,
        category: input.category ?? 'walk',
        requiresApproval: input.requiresApproval ?? false,
        parentEventId: template.id,
        coverImageUrl: input.coverImageUrl ?? null,
      });

      // Add creator as organizer
      await groupEventRepo.addParticipant({
        eventId: occurrence.id,
        userId,
        dogId: input.dogId,
        status: 'accepted',
        isOrganizer: true,
      });

      occurrences.push(occurrence);
    }

    return succeed({ template, occurrences });
  };
}
