import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildMoodLog, buildMoodLogRepo } from '../test-utils/builders.js';
import { createListDogMoodLogs } from './list-dog-mood-logs.js';

describe('createListDogMoodLogs', () => {
  const dog = buildDog({ id: 'dog-1', ownerId: 'user-1' });

  it('returns mood logs for owned dog', async () => {
    const logs = [buildMoodLog(), buildMoodLog({ id: 'mood-log-2', rating: 5 })];
    const deps = {
      moodLogRepo: buildMoodLogRepo({
        findByDog: vi.fn().mockResolvedValue({ logs, nextCursor: null }),
      }),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(dog),
      }),
    };

    const listMoodLogs = createListDogMoodLogs(deps);
    const result = await listMoodLogs('user-1', 'dog-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.logs).toHaveLength(2);
    expect(result.data.nextCursor).toBeNull();
  });

  it('fails DOG_NOT_FOUND if dog not owned', async () => {
    const deps = {
      moodLogRepo: buildMoodLogRepo(),
      dogRepo: buildDogRepo({
        findByIdAndOwner: vi.fn().mockResolvedValue(null),
      }),
    };

    const listMoodLogs = createListDogMoodLogs(deps);
    const result = await listMoodLogs('user-1', 'dog-x');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });
});
