import { USER_LEVEL, XP_ACTION, XP_POINTS } from '@pawmeet/config';
import type { XpTransaction } from '@pawmeet/types';
import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildGamificationRepo } from '../test-utils/builders.js';
import { createAwardXp } from './award-xp.js';

function buildXpTransaction(overrides: Partial<XpTransaction> = {}): XpTransaction {
  return {
    id: 'xp-1',
    userId: 'user-1',
    action: XP_ACTION.WALK_COMPLETED,
    points: 50,
    metadata: null,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

describe('awardXp', () => {
  it('creates an XP transaction with correct points for the action', async () => {
    const repo = buildGamificationRepo({
      createXpTransaction: vi.fn().mockResolvedValue(buildXpTransaction()),
      getTotalXp: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(50),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });

    const result = await awardXp('user-1', XP_ACTION.WALK_COMPLETED);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.xpAwarded).toBe(XP_POINTS[XP_ACTION.WALK_COMPLETED]);
    expect(result.data.previousLevel).toBe(USER_LEVEL.CUCCIOLO);
    expect(repo.createXpTransaction).toHaveBeenCalledWith(
      'user-1',
      XP_ACTION.WALK_COMPLETED,
      50,
      undefined,
    );
  });

  it('returns correct level for accumulated XP', async () => {
    const repo = buildGamificationRepo({
      createXpTransaction: vi.fn().mockResolvedValue(buildXpTransaction()),
      getTotalXp: vi.fn().mockResolvedValueOnce(120).mockResolvedValueOnce(150),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });

    const result = await awardXp('user-1', XP_ACTION.MATCH_MADE);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.summary.totalXp).toBe(150);
    expect(result.data.summary.level).toBe(USER_LEVEL.ESPLORATORE);
    expect(result.data.previousLevel).toBe(USER_LEVEL.ESPLORATORE);
  });

  it('detects level-up when XP crosses threshold', async () => {
    const repo = buildGamificationRepo({
      createXpTransaction: vi.fn().mockResolvedValue(buildXpTransaction()),
      getTotalXp: vi.fn().mockResolvedValueOnce(90).mockResolvedValueOnce(110),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });

    const result = await awardXp('user-1', XP_ACTION.WALK_COMPLETED);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.previousLevel).toBe(USER_LEVEL.CUCCIOLO);
    expect(result.data.summary.level).toBe(USER_LEVEL.ESPLORATORE);
  });

  it('passes metadata through to the transaction', async () => {
    const repo = buildGamificationRepo({
      createXpTransaction: vi.fn().mockResolvedValue(buildXpTransaction()),
      getTotalXp: vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(10),
    });
    const awardXp = createAwardXp({ gamificationRepo: repo });
    const metadata = { walkId: 'walk-123' };

    await awardXp('user-1', XP_ACTION.FEEDBACK_GIVEN, metadata);

    expect(repo.createXpTransaction).toHaveBeenCalledWith(
      'user-1',
      XP_ACTION.FEEDBACK_GIVEN,
      XP_POINTS[XP_ACTION.FEEDBACK_GIVEN],
      metadata,
    );
  });
});
