import type { Walk } from '@dogwalk/types';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { WalkRepository } from '../ports/index.js';
import { createListUpcomingWalks } from './list-upcoming-walks.js';

function buildWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: 'walk-1',
    matchId: 'match-1',
    createdBy: 'user-1',
    title: null,
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 30,
    location: null,
    latitude: null,
    longitude: null,
    status: 'pending',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildWalkRepo(overrides: Partial<WalkRepository> = {}): WalkRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByMatchId: vi.fn(),
    findUpcoming: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe('listUpcomingWalks', () => {
  it('returns upcoming walks for a user', async () => {
    const walks = [buildWalk(), buildWalk({ id: 'walk-2' })];
    const walkRepo = buildWalkRepo({ findUpcoming: vi.fn().mockResolvedValue(walks) });
    const listUpcomingWalks = createListUpcomingWalks({ walkRepo });

    const result = await listUpcomingWalks('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walks).toHaveLength(2);
    expect(walkRepo.findUpcoming).toHaveBeenCalledWith('user-1');
  });

  it('returns empty array when no upcoming walks', async () => {
    const walkRepo = buildWalkRepo();
    const listUpcomingWalks = createListUpcomingWalks({ walkRepo });

    const result = await listUpcomingWalks('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.walks).toHaveLength(0);
  });
});
