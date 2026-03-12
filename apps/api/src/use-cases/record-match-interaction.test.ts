import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildMatch, buildMatchingAiRepo, buildMatchRepo } from '../test-utils/builders.js';
import { createRecordMatchInteraction } from './record-match-interaction.js';

describe('createRecordMatchInteraction', () => {
  it('records a walk_completed interaction for an existing match', async () => {
    const match = buildMatch();
    const interaction = {
      id: 'interaction-1',
      matchId: 'match-1',
      userId: 'user-1',
      interactionType: 'walk_completed',
      metadata: null,
      createdAt: new Date(),
    };
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(match),
    });
    const matchingAiRepo = buildMatchingAiRepo({
      createMatchInteraction: vi.fn().mockResolvedValue(interaction),
    });

    const recordInteraction = createRecordMatchInteraction({ matchingAiRepo, matchRepo });
    const result = await recordInteraction('user-1', 'match-1', 'walk_completed');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.interaction.interactionType).toBe('walk_completed');
    expect(matchingAiRepo.createMatchInteraction).toHaveBeenCalledWith({
      matchId: 'match-1',
      userId: 'user-1',
      interactionType: 'walk_completed',
      metadata: undefined,
    });
  });

  it('fails when the match does not exist', async () => {
    const matchRepo = buildMatchRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const matchingAiRepo = buildMatchingAiRepo();

    const recordInteraction = createRecordMatchInteraction({ matchingAiRepo, matchRepo });
    const result = await recordInteraction('user-1', 'match-999', 'walk_completed');

    expect(isSuccess(result)).toBe(false);
    if (isSuccess(result)) return;
    expect(result.error.code).toBe('MATCH_NOT_FOUND');
  });
});
