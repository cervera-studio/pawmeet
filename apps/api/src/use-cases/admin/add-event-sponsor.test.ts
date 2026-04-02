import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type {
  AdminEventSponsorRow,
  AdminGroupEventRepository,
  AdminOrganizationRepository,
} from '../../ports/admin-data-repository.js';
import { createAddEventSponsor } from './add-event-sponsor.js';

const sponsorRow = {
  id: 'sponsor-1',
  eventId: 'event-1',
  organizationId: 'org-1',
  tier: 'gold',
  logoPlacement: 'banner',
  createdAt: new Date(),
} satisfies AdminEventSponsorRow;

function buildAdminDataRepo(
  overrides: Partial<
    Pick<
      AdminGroupEventRepository,
      'findGroupEventById' | 'countEventSponsorsByTier' | 'addEventSponsor'
    > &
      Pick<AdminOrganizationRepository, 'findOrganizationById'>
  > = {},
) {
  return {
    findGroupEventById: vi.fn().mockResolvedValue({ id: 'event-1' }),
    findOrganizationById: vi.fn().mockResolvedValue({
      id: 'org-1',
      name: 'Dog Club',
      slug: 'dog-club',
      type: 'association',
      description: null,
      logoUrl: null,
      websiteUrl: null,
      contactEmail: null,
      isVerified: true,
      verifiedAt: new Date(),
      isActive: true,
      createdAt: new Date(),
      verifiedBy: 'admin-1',
      updatedAt: new Date(),
    }),
    countEventSponsorsByTier: vi.fn().mockResolvedValue(0),
    addEventSponsor: vi.fn().mockResolvedValue(sponsorRow),
    ...overrides,
  };
}

describe('addEventSponsor', () => {
  const baseInput = {
    eventId: 'event-1',
    organizationId: 'org-1',
    tier: 'gold' as const,
    logoPlacement: 'banner',
  };

  it('adds a sponsor successfully', async () => {
    const adminDataRepo = buildAdminDataRepo();
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('sponsor-1');
    expect(result.data.tier).toBe('gold');
  });

  it('fails when event is not found', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findGroupEventById: vi.fn().mockResolvedValue(null),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails when organization is not found', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findOrganizationById: vi.fn().mockResolvedValue(null),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails when organization is not verified', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findOrganizationById: vi.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Dog Club',
        slug: 'dog-club',
        type: 'association',
        description: null,
        logoUrl: null,
        websiteUrl: null,
        contactEmail: null,
        isVerified: false,
        verifiedAt: null,
        isActive: true,
        createdAt: new Date(),
        verifiedBy: null,
        updatedAt: new Date(),
      }),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_ELIGIBLE');
    expect(result.error.status).toBe(400);
  });

  it('fails when organization is not active', async () => {
    const adminDataRepo = buildAdminDataRepo({
      findOrganizationById: vi.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Dog Club',
        slug: 'dog-club',
        type: 'association',
        description: null,
        logoUrl: null,
        websiteUrl: null,
        contactEmail: null,
        isVerified: true,
        verifiedAt: new Date(),
        isActive: false,
        createdAt: new Date(),
        verifiedBy: 'admin-1',
        updatedAt: new Date(),
      }),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ORG_NOT_ELIGIBLE');
    expect(result.error.status).toBe(400);
  });

  it('fails when title tier limit is reached', async () => {
    const adminDataRepo = buildAdminDataRepo({
      countEventSponsorsByTier: vi.fn().mockResolvedValue(1),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase({ ...baseInput, tier: 'title' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TIER_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
  });

  it('fails when gold tier limit is reached', async () => {
    const adminDataRepo = buildAdminDataRepo({
      countEventSponsorsByTier: vi.fn().mockResolvedValue(2),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase(baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('TIER_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
  });

  it('allows partner tier without limit check', async () => {
    const adminDataRepo = buildAdminDataRepo({
      countEventSponsorsByTier: vi.fn().mockResolvedValue(100),
    });
    const useCase = createAddEventSponsor({ adminDataRepo });
    const result = await useCase({ ...baseInput, tier: 'partner' });

    expect(isSuccess(result)).toBe(true);
  });
});
