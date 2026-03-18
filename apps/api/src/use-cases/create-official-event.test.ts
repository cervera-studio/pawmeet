import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildGroupEvent,
  buildGroupEventRepo,
  buildOrganization,
  buildOrganizationMember,
  buildOrganizationRepo,
} from '../test-utils/builders.js';
import { createCreateOfficialEvent } from './create-official-event.js';

describe('createOfficialEvent', () => {
  function setup(
    overrides: {
      member?: ReturnType<typeof buildOrganizationMember> | null;
      org?: ReturnType<typeof buildOrganization> | null;
      dog?: ReturnType<typeof buildDog> | null;
    } = {},
  ) {
    const organizationRepo = buildOrganizationRepo({
      findMember: vi
        .fn()
        .mockResolvedValue(
          overrides.member === undefined ? buildOrganizationMember() : overrides.member,
        ),
      findById: vi
        .fn()
        .mockResolvedValue(overrides.org === undefined ? buildOrganization() : overrides.org),
    });

    const groupEventRepo = buildGroupEventRepo({
      create: vi
        .fn()
        .mockResolvedValue(buildGroupEvent({ isOfficial: true, organizationId: 'org-1' })),
    });

    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi
        .fn()
        .mockResolvedValue(overrides.dog === undefined ? buildDog() : overrides.dog),
    });

    const createEvent = createCreateOfficialEvent({
      organizationRepo,
      groupEventRepo,
      dogRepo,
    });

    return { createEvent, groupEventRepo, organizationRepo };
  }

  const validInput = {
    title: 'Raduno Golden Retriever',
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 120,
    location: 'Parco Sempione',
    latitude: 45.4729,
    longitude: 9.1797,
    maxParticipants: 100,
    dogId: 'dog-1',
    organizationId: 'org-1',
  };

  it('creates official event for verified org member', async () => {
    const { createEvent, groupEventRepo } = setup();

    const result = await createEvent('user-1', validInput);

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        isOfficial: true,
        organizationId: 'org-1',
        visibility: 'public',
        requiresApproval: false,
      }),
    );
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ isOrganizer: true }),
    );
  });

  it('fails if user is not a member', async () => {
    const { createEvent } = setup({ member: null });

    const result = await createEvent('user-1', validInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_MEMBER');
  });

  it('fails if organization is not verified', async () => {
    const { createEvent } = setup({
      org: buildOrganization({ isVerified: false }),
    });

    const result = await createEvent('user-1', validInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_VERIFIED');
  });

  it('fails if date is in the past', async () => {
    const { createEvent } = setup();

    const result = await createEvent('user-1', {
      ...validInput,
      scheduledAt: new Date('2020-01-01'),
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_INVALID_DATE');
  });

  it('fails if dog not found', async () => {
    const { createEvent } = setup({ dog: null });

    const result = await createEvent('user-1', validInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });
});
