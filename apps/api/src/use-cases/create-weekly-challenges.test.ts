import { isSuccess } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { WEEKLY_CHALLENGE_TEMPLATES } from '../constants/challenges.js';
import { buildGamificationRepo } from '../test-utils/builders.js';
import { createCreateWeeklyChallenges } from './create-weekly-challenges.js';

function buildDeps(overrides: Partial<Parameters<typeof createCreateWeeklyChallenges>[0]> = {}) {
  const gamificationRepo = buildGamificationRepo(overrides.gamificationRepo);
  return { gamificationRepo };
}

describe('createWeeklyChallenges', () => {
  it('creates one challenge per template and returns them', async () => {
    const deps = buildDeps();
    const execute = createCreateWeeklyChallenges(deps);

    const result = await execute();

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.challenges).toHaveLength(WEEKLY_CHALLENGE_TEMPLATES.length);
    expect(deps.gamificationRepo.createChallenge).toHaveBeenCalledTimes(
      WEEKLY_CHALLENGE_TEMPLATES.length,
    );
  });

  it('passes correct startsAt/endsAt (next Monday to Sunday)', async () => {
    const deps = buildDeps();
    const execute = createCreateWeeklyChallenges(deps);

    const result = await execute();

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    const challenge = result.data.challenges[0];
    // startsAt should be a Monday (getUTCDay === 1)
    expect(new Date(challenge.startsAt).getUTCDay()).toBe(1);
    // endsAt should be a Sunday (getUTCDay === 0)
    expect(new Date(challenge.endsAt).getUTCDay()).toBe(0);
  });
});
