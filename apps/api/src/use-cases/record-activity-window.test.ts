import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildMatchingAiRepo } from '../test-utils/builders.js';
import { createRecordActivityWindow } from './record-activity-window.js';

describe('createRecordActivityWindow', () => {
  it('upserts an activity window and returns it', async () => {
    const window = {
      id: 'window-1',
      userId: 'user-1',
      dayOfWeek: 1,
      hourOfDay: 9,
      activityCount: 3,
      updatedAt: new Date(),
    };
    const matchingAiRepo = buildMatchingAiRepo({
      upsertActivityWindow: vi.fn().mockResolvedValue(window),
    });

    const recordActivityWindow = createRecordActivityWindow({ matchingAiRepo });
    const result = await recordActivityWindow('user-1', 1, 9);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.window.dayOfWeek).toBe(1);
    expect(result.data.window.hourOfDay).toBe(9);
    expect(matchingAiRepo.upsertActivityWindow).toHaveBeenCalledWith({
      userId: 'user-1',
      dayOfWeek: 1,
      hourOfDay: 9,
    });
  });

  it('increments activity count on repeated calls', async () => {
    const window = {
      id: 'window-1',
      userId: 'user-1',
      dayOfWeek: 5,
      hourOfDay: 17,
      activityCount: 10,
      updatedAt: new Date(),
    };
    const matchingAiRepo = buildMatchingAiRepo({
      upsertActivityWindow: vi.fn().mockResolvedValue(window),
    });

    const recordActivityWindow = createRecordActivityWindow({ matchingAiRepo });
    const result = await recordActivityWindow('user-1', 5, 17);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.window.activityCount).toBe(10);
  });
});
