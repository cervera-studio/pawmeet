import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildEventSponsor, buildEventSponsorRepo } from '../test-utils/builders.js';
import { createRemoveEventSponsor } from './remove-event-sponsor.js';

function buildDeps(overrides: Partial<Parameters<typeof createRemoveEventSponsor>[0]> = {}) {
  const eventSponsorRepo = buildEventSponsorRepo(overrides.eventSponsorRepo);
  return { eventSponsorRepo };
}

describe('removeEventSponsor', () => {
  it('removes sponsor when it exists', async () => {
    const deps = buildDeps({
      eventSponsorRepo: {
        findByEvent: vi.fn().mockResolvedValue([buildEventSponsor({ organizationId: 'org-1' })]),
      },
    });
    const execute = createRemoveEventSponsor(deps);

    const result = await execute('event-1', 'org-1');

    expect(isSuccess(result)).toBe(true);
    expect(deps.eventSponsorRepo.remove).toHaveBeenCalledWith('event-1', 'org-1');
  });

  it('fails with 404 when sponsor does not exist', async () => {
    const deps = buildDeps();
    const execute = createRemoveEventSponsor(deps);

    const result = await execute('event-1', 'org-missing');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(404);
  });
});
