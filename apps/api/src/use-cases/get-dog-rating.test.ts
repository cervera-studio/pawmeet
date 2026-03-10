import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { FeedbackRepository } from '../ports/index.js';
import { createGetDogRating } from './get-dog-rating.js';

function buildFeedbackRepo(overrides: Partial<FeedbackRepository> = {}): FeedbackRepository {
  return {
    create: vi.fn(),
    findByWalk: vi.fn(),
    findByDog: vi.fn(),
    getAverageRating: vi.fn().mockResolvedValue({ average: null, count: 0 }),
    hasSubmitted: vi.fn(),
    ...overrides,
  };
}

describe('getDogRating', () => {
  it('returns average and count', async () => {
    const feedbackRepo = buildFeedbackRepo({
      getAverageRating: vi.fn().mockResolvedValue({ average: 4.2, count: 5 }),
    });
    const getDogRating = createGetDogRating({ feedbackRepo });

    const result = await getDogRating('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.average).toBe(4.2);
    expect(result.data.count).toBe(5);
  });

  it('returns null average when no ratings exist', async () => {
    const feedbackRepo = buildFeedbackRepo({
      getAverageRating: vi.fn().mockResolvedValue({ average: null, count: 0 }),
    });
    const getDogRating = createGetDogRating({ feedbackRepo });

    const result = await getDogRating('dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.average).toBeNull();
    expect(result.data.count).toBe(0);
  });
});
