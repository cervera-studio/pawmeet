import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildMatchingAiRepo } from '../test-utils/builders.js';
import { createLogSwipeScores } from './log-swipe-scores.js';

describe('createLogSwipeScores', () => {
  const swipeInput = {
    swiperDogId: 'dog-1',
    swipedDogId: 'dog-2',
    direction: 'like' as const,
    sizeScore: 0.7,
    energyScore: 0.8,
    behaviorScore: 0.9,
    walkScore: 0.6,
    distanceScore: 0.5,
    leashScore: 0.7,
    overallScore: 0.72,
  };

  it('logs swipe scores and returns the created log', async () => {
    const expectedLog = { id: 'log-1', ...swipeInput, createdAt: new Date() };
    const matchingAiRepo = buildMatchingAiRepo({
      createSwipeScoreLog: vi.fn().mockResolvedValue(expectedLog),
    });

    const logSwipeScores = createLogSwipeScores({ matchingAiRepo });
    const result = await logSwipeScores(swipeInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.log).toEqual(expectedLog);
    expect(matchingAiRepo.createSwipeScoreLog).toHaveBeenCalledWith(swipeInput);
  });

  it('logs pass swipe scores correctly', async () => {
    const passInput = { ...swipeInput, direction: 'pass' as const, overallScore: 0.3 };
    const expectedLog = { id: 'log-2', ...passInput, createdAt: new Date() };
    const matchingAiRepo = buildMatchingAiRepo({
      createSwipeScoreLog: vi.fn().mockResolvedValue(expectedLog),
    });

    const logSwipeScores = createLogSwipeScores({ matchingAiRepo });
    const result = await logSwipeScores(passInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.log.direction).toBe('pass');
  });
});
