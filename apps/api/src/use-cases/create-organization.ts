import { AppError, fail, type Organization, type Result, succeed } from '@pawmeet/types';
import type { OrganizationRepository } from '../ports/index.js';

type Deps = {
  organizationRepo: OrganizationRepository;
};

type CreateOrganizationInput = {
  name: string;
  slug: string;
  type: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
};

export function createCreateOrganization({ organizationRepo }: Deps) {
  return async (_adminUserId: string, input: CreateOrganizationInput): Promise<Result<Organization>> => {
    const existing = await organizationRepo.findBySlug(input.slug);
    if (existing) {
      return fail(new AppError('ORG_SLUG_TAKEN', 'Questo slug è già in uso', 409));
    }

    const org = await organizationRepo.create({
      name: input.name,
      slug: input.slug,
      type: input.type,
      description: input.description ?? null,
      logoUrl: input.logoUrl ?? null,
      websiteUrl: input.websiteUrl ?? null,
      contactEmail: input.contactEmail ?? null,
    });

    return succeed(org);
  };
}
