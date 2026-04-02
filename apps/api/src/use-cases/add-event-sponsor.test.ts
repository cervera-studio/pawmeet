import { describe, expect, it, vi } from 'vitest';
import {
  buildEventSponsorRepo,
  buildGroupEvent,
  buildGroupEventRepo,
  buildOrganization,
  buildOrganizationRepo,
} from '../test-utils/builders.js';
import { createAddEventSponsor } from './add-event-sponsor.js';

function setup(
  overrides: {
    eventSponsorRepo?: Partial<Parameters<typeof createAddEventSponsor>[0]['eventSponsorRepo']>;
    groupEventRepo?: Partial<Parameters<typeof createAddEventSponsor>[0]['groupEventRepo']>;
    organizationRepo?: Partial<Parameters<typeof createAddEventSponsor>[0]['organizationRepo']>;
  } = {},
) {
  const eventSponsorRepo = buildEventSponsorRepo(overrides.eventSponsorRepo);
  const groupEventRepo = buildGroupEventRepo({
    findById: vi.fn().mockResolvedValue(buildGroupEvent({ isOfficial: true })),
    ...overrides.groupEventRepo,
  });
  const organizationRepo = buildOrganizationRepo({
    findById: vi.fn().mockResolvedValue(buildOrganization({ isVerified: true, isActive: true })),
    ...overrides.organizationRepo,
  });

  const addEventSponsor = createAddEventSponsor({
    eventSponsorRepo,
    groupEventRepo,
    organizationRepo,
  });
  return { addEventSponsor, eventSponsorRepo, groupEventRepo, organizationRepo };
}

describe('addEventSponsor', () => {
  it('adds a sponsor to an event', async () => {
    const { addEventSponsor } = setup();
    const result = await addEventSponsor({
      eventId: 'event-1',
      organizationId: 'org-1',
      tier: 'partner',
      logoPlacement: 'footer',
    });
    expect(result.success).toBe(true);
  });

  it('fails if event not found', async () => {
    const { addEventSponsor } = setup({
      groupEventRepo: { findById: vi.fn().mockResolvedValue(null) },
    });
    const result = await addEventSponsor({
      eventId: 'missing',
      organizationId: 'org-1',
      tier: 'partner',
      logoPlacement: 'footer',
    });
    expect(result.success).toBe(false);
  });

  it('fails if org not verified', async () => {
    const { addEventSponsor } = setup({
      organizationRepo: {
        findById: vi.fn().mockResolvedValue(buildOrganization({ isVerified: false })),
      },
    });
    const result = await addEventSponsor({
      eventId: 'event-1',
      organizationId: 'org-1',
      tier: 'partner',
      logoPlacement: 'footer',
    });
    expect(result.success).toBe(false);
  });

  it('fails if tier limit reached', async () => {
    const { addEventSponsor } = setup({
      eventSponsorRepo: { countByEventAndTier: vi.fn().mockResolvedValue(1) },
    });
    const result = await addEventSponsor({
      eventId: 'event-1',
      organizationId: 'org-1',
      tier: 'title',
      logoPlacement: 'header',
    });
    expect(result.success).toBe(false);
  });
});
