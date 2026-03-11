import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildFeedback, buildFeedbackRepo } from '../test-utils/builders.js';
import { createListWalkFeedback } from './list-walk-feedback.js';

describe('listWalkFeedback', () => {
  it('returns feedback for a walk', async () => {
    const feedbackList = [
      buildFeedback({ id: 'feedback-1', fromUserId: 'user-1', toDogId: 'dog-2' }),
      buildFeedback({ id: 'feedback-2', fromUserId: 'user-2', toDogId: 'dog-1' }),
    ];
    const feedbackRepo = buildFeedbackRepo({
      findByWalk: vi.fn().mockResolvedValue(feedbackList),
    });
    const listWalkFeedback = createListWalkFeedback({ feedbackRepo });

    const result = await listWalkFeedback('walk-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe('feedback-1');
    expect(result.data[1].id).toBe('feedback-2');
    expect(feedbackRepo.findByWalk).toHaveBeenCalledWith('walk-1');
  });

  it('returns empty array when no feedback exists', async () => {
    const feedbackRepo = buildFeedbackRepo();
    const listWalkFeedback = createListWalkFeedback({ feedbackRepo });

    const result = await listWalkFeedback('walk-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(0);
  });
});
