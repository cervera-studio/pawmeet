import { AB_VARIANT, EXPERIMENT } from '@dogwalk/config';
import { describe, expect, it, vi } from 'vitest';
import type { MatchingAiRepository } from '../ports/index.js';
import { createGetAbAssignment } from './get-ab-assignment.js';

function buildMatchingAiRepo(overrides: Partial<MatchingAiRepository> = {}): MatchingAiRepository {
  return {
    createSwipeScoreLog: vi.fn(),
    findSwipeScoreLogsByDog: vi.fn().mockResolvedValue([]),
    findUserPreferences: vi.fn().mockResolvedValue(null),
    upsertUserPreferences: vi.fn(),
    createMatchInteraction: vi.fn(),
    findInteractionsByMatches: vi.fn().mockResolvedValue([]),
    upsertActivityWindow: vi.fn(),
    findActivityWindowsByUser: vi.fn().mockResolvedValue([]),
    findNearbyActivityWindows: vi.fn().mockResolvedValue([]),
    findExperiment: vi.fn().mockResolvedValue(null),
    findAssignment: vi.fn().mockResolvedValue(null),
    createAssignment: vi
      .fn()
      .mockImplementation((input) =>
        Promise.resolve({ id: 'assign-1', assignedAt: new Date(), ...input }),
      ),
    ...overrides,
  };
}

describe('getAbAssignment', () => {
  it('returns existing assignment if already assigned', async () => {
    const existing = {
      id: 'assign-1',
      userId: 'user-1',
      experimentId: EXPERIMENT.MATCHING_V2,
      variant: AB_VARIANT.AI_ENHANCED,
      assignedAt: new Date(),
    };

    const matchingAiRepo = buildMatchingAiRepo({
      findAssignment: vi.fn().mockResolvedValue(existing),
    });

    const getAssignment = createGetAbAssignment({ matchingAiRepo });
    const result = await getAssignment('user-1', EXPERIMENT.MATCHING_V2);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assignment.variant).toBe(AB_VARIANT.AI_ENHANCED);
    }
    expect(matchingAiRepo.createAssignment).not.toHaveBeenCalled();
  });

  it('creates deterministic assignment for new users', async () => {
    const matchingAiRepo = buildMatchingAiRepo();

    const getAssignment = createGetAbAssignment({ matchingAiRepo });

    // Same user should always get the same variant
    const result1 = await getAssignment('user-fixed-id', EXPERIMENT.MATCHING_V2);
    expect(result1.success).toBe(true);

    expect(matchingAiRepo.createAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-fixed-id',
        experimentId: EXPERIMENT.MATCHING_V2,
        variant: expect.stringMatching(/^(rule_based|ai_enhanced)$/),
      }),
    );
  });
});
