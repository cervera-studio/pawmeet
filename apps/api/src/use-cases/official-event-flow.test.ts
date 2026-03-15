import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildBadgeRepo,
  buildDog,
  buildDogRepo,
  buildEventSponsor,
  buildEventSponsorRepo,
  buildGroupEvent,
  buildGroupEventRepo,
  buildOrganization,
  buildOrganizationMember,
  buildOrganizationRepo,
} from '../test-utils/builders.js';
import { createAddEventSponsor } from './add-event-sponsor.js';
import { createCreateOfficialEvent } from './create-official-event.js';
import { createListEventSponsors } from './list-event-sponsors.js';
import { createTransitionEventStatuses } from './transition-event-statuses.js';

/**
 * End-to-end flow test:
 * Organization creation → official event → sponsor assignment → event completion → badge award
 */
describe('official event end-to-end flow', () => {
  it('full flow: create org → create event → add sponsor → complete → award badge', async () => {
    const org = buildOrganization({ isVerified: true, isActive: true });
    const event = buildGroupEvent({
      isOfficial: true,
      organizationId: org.id,
      status: 'in_progress',
    });

    // 1. Create official event
    const organizationRepo = buildOrganizationRepo({
      findMember: vi.fn().mockResolvedValue(buildOrganizationMember()),
      findById: vi.fn().mockResolvedValue(org),
    });
    const groupEventRepo = buildGroupEventRepo({
      create: vi.fn().mockResolvedValue(event),
      findById: vi.fn().mockResolvedValue(event),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });

    const createEvent = createCreateOfficialEvent({ organizationRepo, groupEventRepo, dogRepo });
    const createResult = await createEvent('user-1', {
      title: 'Main Event Test',
      scheduledAt: new Date('2027-06-15T10:00:00Z'),
      durationMin: 120,
      location: 'Parco Sempione',
      latitude: 45.4729,
      longitude: 9.1797,
      maxParticipants: 100,
      dogId: 'dog-1',
      organizationId: org.id,
    });
    expect(isSuccess(createResult)).toBe(true);

    // 2. Add sponsor
    const sponsorRepo = buildEventSponsorRepo({
      add: vi.fn().mockResolvedValue(
        buildEventSponsor({
          eventId: event.id,
          organizationId: org.id,
          tier: 'gold',
        }),
      ),
    });
    const addSponsor = createAddEventSponsor({
      eventSponsorRepo: sponsorRepo,
      groupEventRepo: buildGroupEventRepo({
        findById: vi.fn().mockResolvedValue(event),
      }),
      organizationRepo: buildOrganizationRepo({
        findById: vi.fn().mockResolvedValue(org),
      }),
    });
    const sponsorResult = await addSponsor({
      eventId: event.id,
      organizationId: org.id,
      tier: 'gold',
      logoPlacement: 'header',
    });
    expect(isSuccess(sponsorResult)).toBe(true);

    // 3. List sponsors
    const sponsorWithOrg = {
      ...buildEventSponsor({ eventId: event.id, tier: 'gold' }),
      organizationName: org.name,
      organizationLogoUrl: org.logoUrl,
    };
    const listSponsorsRepo = buildEventSponsorRepo({
      findByEventWithOrg: vi.fn().mockResolvedValue([sponsorWithOrg]),
    });
    const listSponsors = createListEventSponsors({ eventSponsorRepo: listSponsorsRepo });
    const sponsorsResult = await listSponsors(event.id);
    expect(isSuccess(sponsorsResult)).toBe(true);
    if (isSuccess(sponsorsResult)) {
      expect(sponsorsResult.data).toHaveLength(1);
    }

    // 4. Complete event → badge awarded
    const badgeRepo = buildBadgeRepo({
      hasBadge: vi.fn().mockResolvedValue(false),
      award: vi.fn().mockResolvedValue({
        id: 'badge-1',
        dogId: 'dog-1',
        type: 'main_event',
        awardedAt: new Date(),
      }),
    });
    const notificationService = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    const completionGroupEventRepo = buildGroupEventRepo({
      findScheduledPastStart: vi.fn().mockResolvedValue([]),
      findInProgressPastEnd: vi.fn().mockResolvedValue([event]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      findByIdWithParticipants: vi.fn().mockResolvedValue({
        ...event,
        participants: [
          {
            id: 'p-1',
            eventId: event.id,
            userId: 'user-1',
            dogId: 'dog-1',
            status: 'accepted',
            isOrganizer: true,
            joinedAt: new Date(),
          },
          {
            id: 'p-2',
            eventId: event.id,
            userId: 'user-2',
            dogId: 'dog-2',
            status: 'accepted',
            isOrganizer: false,
            joinedAt: new Date(),
          },
        ],
        participantCount: 2,
      }),
    });

    const transitionStatuses = createTransitionEventStatuses({
      groupEventRepo: completionGroupEventRepo,
      notificationService,
      badgeRepo,
    });

    const result = await transitionStatuses();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completedCount).toBe(1);
    }
    expect(completionGroupEventRepo.updateStatus).toHaveBeenCalledWith(event.id, 'completed');
    // Badge awarded to both participants' dogs
    expect(badgeRepo.hasBadge).toHaveBeenCalledWith('dog-1', 'main_event');
    expect(badgeRepo.hasBadge).toHaveBeenCalledWith('dog-2', 'main_event');
    expect(badgeRepo.award).toHaveBeenCalledTimes(2);
    // Notifications sent to both participants
    expect(notificationService.send).toHaveBeenCalledTimes(2);
  });

  it('does not award badge for non-official events', async () => {
    const event = buildGroupEvent({ isOfficial: false, status: 'in_progress' });

    const badgeRepo = buildBadgeRepo();
    const notificationService = { send: vi.fn().mockResolvedValue(undefined) };
    const groupEventRepo = buildGroupEventRepo({
      findScheduledPastStart: vi.fn().mockResolvedValue([]),
      findInProgressPastEnd: vi.fn().mockResolvedValue([event]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      findByIdWithParticipants: vi.fn().mockResolvedValue({
        ...event,
        participants: [
          {
            id: 'p-1',
            eventId: event.id,
            userId: 'user-1',
            dogId: 'dog-1',
            status: 'accepted',
            isOrganizer: true,
            joinedAt: new Date(),
          },
        ],
        participantCount: 1,
      }),
    });

    const transitionStatuses = createTransitionEventStatuses({
      groupEventRepo,
      notificationService,
      badgeRepo,
    });

    await transitionStatuses();

    // Badge should NOT be awarded for non-official events
    expect(badgeRepo.hasBadge).not.toHaveBeenCalled();
    expect(badgeRepo.award).not.toHaveBeenCalled();
  });

  it('skips badge if participant already has it', async () => {
    const event = buildGroupEvent({ isOfficial: true, status: 'in_progress' });

    const badgeRepo = buildBadgeRepo({
      hasBadge: vi.fn().mockResolvedValue(true),
    });
    const notificationService = { send: vi.fn().mockResolvedValue(undefined) };
    const groupEventRepo = buildGroupEventRepo({
      findScheduledPastStart: vi.fn().mockResolvedValue([]),
      findInProgressPastEnd: vi.fn().mockResolvedValue([event]),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      findByIdWithParticipants: vi.fn().mockResolvedValue({
        ...event,
        participants: [
          {
            id: 'p-1',
            eventId: event.id,
            userId: 'user-1',
            dogId: 'dog-1',
            status: 'accepted',
            isOrganizer: false,
            joinedAt: new Date(),
          },
        ],
        participantCount: 1,
      }),
    });

    const transitionStatuses = createTransitionEventStatuses({
      groupEventRepo,
      notificationService,
      badgeRepo,
    });

    await transitionStatuses();

    expect(badgeRepo.hasBadge).toHaveBeenCalledWith('dog-1', 'main_event');
    expect(badgeRepo.award).not.toHaveBeenCalled();
  });
});
