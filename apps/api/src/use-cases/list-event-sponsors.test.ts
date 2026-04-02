import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildEventSponsorRepo } from '../test-utils/builders.js';
import { createListEventSponsors } from './list-event-sponsors.js';

function buildDeps(overrides: Partial<Parameters<typeof createListEventSponsors>[0]> = {}) {
  const eventSponsorRepo = buildEventSponsorRepo(overrides.eventSponsorRepo);
  return { eventSponsorRepo };
}

describe('listEventSponsors', () => {
  it('returns empty array when no sponsors', async () => {
    const deps = buildDeps();
    const execute = createListEventSponsors(deps);

    const result = await execute('event-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toEqual([]);
  });

  it('returns sponsors with organization info', async () => {
    const sponsors = [
      {
        id: 'sponsor-1',
        eventId: 'event-1',
        organizationId: 'org-1',
        tier: 'partner' as const,
        logoPlacement: 'footer' as const,
        createdAt: new Date(),
        organizationName: 'Acme Corp',
        organizationLogoUrl: 'https://example.com/logo.png',
      },
    ];
    const deps = buildDeps({
      eventSponsorRepo: { findByEventWithOrg: vi.fn().mockResolvedValue(sponsors) },
    });
    const execute = createListEventSponsors(deps);

    const result = await execute('event-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data).toHaveLength(1);
    expect(result.data[0].organizationName).toBe('Acme Corp');
  });
});
