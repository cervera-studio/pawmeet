import { USER_LEVEL } from '@dogwalk/config';
import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGamificationRepo } from '../test-utils/builders.js';
import { createGetXpSummary } from './get-xp-summary.js';

describe('getXpSummary', () => {
  it('returns Cucciolo level for 0 XP', async () => {
    const repo = buildGamificationRepo({ getTotalXp: vi.fn().mockResolvedValue(0) });
    const getXpSummary = createGetXpSummary({ gamificationRepo: repo });

    const result = await getXpSummary('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.totalXp).toBe(0);
    expect(result.data.level).toBe(USER_LEVEL.CUCCIOLO);
    expect(result.data.xpToNextLevel).toBe(100);
  });

  it('returns Esploratore level for 250 XP', async () => {
    const repo = buildGamificationRepo({ getTotalXp: vi.fn().mockResolvedValue(250) });
    const getXpSummary = createGetXpSummary({ gamificationRepo: repo });

    const result = await getXpSummary('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.level).toBe(USER_LEVEL.ESPLORATORE);
    expect(result.data.xpToNextLevel).toBe(250);
  });

  it('returns Leggenda level for 2000+ XP with no next level', async () => {
    const repo = buildGamificationRepo({ getTotalXp: vi.fn().mockResolvedValue(5000) });
    const getXpSummary = createGetXpSummary({ gamificationRepo: repo });

    const result = await getXpSummary('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.level).toBe(USER_LEVEL.LEGGENDA);
    expect(result.data.xpToNextLevel).toBeNull();
  });
});
