import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { EmergencyContactRepository } from '../ports/emergency-contact-repository.js';
import {
  buildNotificationService,
  buildUser,
  buildUserRepo,
  buildWalk,
  buildWalkRepo,
} from '../test-utils/builders.js';
import { createWalkCheckin, createWalkSos } from './walk-sos.js';

const buildEmergencyContactRepo = (
  overrides: Partial<EmergencyContactRepository> = {},
): EmergencyContactRepository =>
  ({
    createCheckin: vi.fn().mockResolvedValue({ id: 'checkin-1' }),
    findByUserId: vi.fn().mockResolvedValue([]),
    findCheckinsByWalk: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }) as EmergencyContactRepository;

describe('createWalkSos', () => {
  function buildDeps(
    overrides: {
      walkRepo?: ReturnType<typeof buildWalkRepo>;
      userRepo?: ReturnType<typeof buildUserRepo>;
      emergencyContactRepo?: EmergencyContactRepository;
      notificationService?: ReturnType<typeof buildNotificationService>;
    } = {},
  ) {
    return {
      walkRepo:
        overrides.walkRepo ??
        buildWalkRepo({
          findById: vi
            .fn()
            .mockResolvedValue(buildWalk({ status: 'accepted', createdBy: 'other-user' })),
        }),
      userRepo:
        overrides.userRepo ?? buildUserRepo({ findById: vi.fn().mockResolvedValue(buildUser()) }),
      emergencyContactRepo: overrides.emergencyContactRepo ?? buildEmergencyContactRepo(),
      notificationService: overrides.notificationService ?? buildNotificationService(),
    };
  }

  it('sends SOS alert and notifies walk partner', async () => {
    const deps = buildDeps();
    const execute = createWalkSos(deps);

    const result = await execute('user-1', 'walk-1', 45.0, 9.0);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toContain('SOS sent');
    expect(deps.emergencyContactRepo.createCheckin).toHaveBeenCalledOnce();
    expect(deps.notificationService.send).toHaveBeenCalledOnce();
  });

  it('returns 404 when walk does not exist', async () => {
    const deps = buildDeps({
      walkRepo: buildWalkRepo({ findById: vi.fn().mockResolvedValue(null) }),
    });
    const execute = createWalkSos(deps);

    const result = await execute('user-1', 'walk-999');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(404);
  });

  it('returns 400 when walk is not active', async () => {
    const deps = buildDeps({
      walkRepo: buildWalkRepo({
        findById: vi.fn().mockResolvedValue(buildWalk({ status: 'completed' })),
      }),
    });
    const execute = createWalkSos(deps);

    const result = await execute('user-1', 'walk-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(400);
  });
});

describe('createWalkCheckin', () => {
  it('records a safety check-in successfully', async () => {
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(buildWalk({ status: 'accepted' })),
    });
    const emergencyContactRepo = buildEmergencyContactRepo();
    const execute = createWalkCheckin({ emergencyContactRepo, walkRepo });

    const result = await execute('user-1', 'walk-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Check-in recorded');
    expect(emergencyContactRepo.createCheckin).toHaveBeenCalledOnce();
  });

  it('returns 404 when walk does not exist', async () => {
    const walkRepo = buildWalkRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const emergencyContactRepo = buildEmergencyContactRepo();
    const execute = createWalkCheckin({ emergencyContactRepo, walkRepo });

    const result = await execute('user-1', 'walk-999');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(404);
  });
});
