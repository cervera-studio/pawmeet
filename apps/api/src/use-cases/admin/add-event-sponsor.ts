import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type {
  AdminEventSponsorRow,
  AdminGroupEventRepository,
  AdminOrganizationRepository,
} from '../../ports/admin-data-repository.js';

type Deps = {
  adminDataRepo: Pick<
    AdminGroupEventRepository,
    'findGroupEventById' | 'countEventSponsorsByTier' | 'addEventSponsor'
  > &
    Pick<AdminOrganizationRepository, 'findOrganizationById'>;
};

interface AddEventSponsorInput {
  eventId: string;
  organizationId: string;
  tier: 'title' | 'gold' | 'silver' | 'partner';
  logoPlacement: string;
}

const TIER_LIMITS: Record<string, number> = { title: 1, gold: 2, silver: 5 };

export function createAddEventSponsor({ adminDataRepo }: Deps) {
  return async (input: AddEventSponsorInput): Promise<Result<AdminEventSponsorRow>> => {
    const event = await adminDataRepo.findGroupEventById(input.eventId);
    if (!event) {
      return fail(new AppError('EVENT_NOT_FOUND', 'Event not found', 404));
    }

    const org = await adminDataRepo.findOrganizationById(input.organizationId);
    if (!org) {
      return fail(new AppError('ORG_NOT_FOUND', 'Organization not found', 404));
    }
    if (!(org.isVerified && org.isActive)) {
      return fail(
        new AppError('ORG_NOT_ELIGIBLE', 'Organization must be verified and active', 400),
      );
    }

    const limit = TIER_LIMITS[input.tier];
    if (limit !== undefined) {
      const currentCount = await adminDataRepo.countEventSponsorsByTier(input.eventId, input.tier);
      if (currentCount >= limit) {
        return fail(
          new AppError(
            'TIER_LIMIT_REACHED',
            `Tier limit reached (max ${limit} for ${input.tier})`,
            400,
          ),
        );
      }
    }

    const sponsor = await adminDataRepo.addEventSponsor(input);
    return succeed(sponsor);
  };
}
