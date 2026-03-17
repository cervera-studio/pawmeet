import { z } from 'zod';

export const organizationTypeEnum = z.enum(['pawmeet_team', 'association', 'educator', 'brand']);

export const organizationMemberRoleEnum = z.enum(['owner', 'admin', 'member']);

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug_format'),
  type: organizationTypeEnum,
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().max(500).optional(),
  websiteUrl: z.string().url().max(500).optional(),
  contactEmail: z.string().email().max(255).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const verifyOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
});

export type VerifyOrganizationInput = z.infer<typeof verifyOrganizationSchema>;

export const addOrganizationMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: organizationMemberRoleEnum,
});

export type AddOrganizationMemberInput = z.infer<typeof addOrganizationMemberSchema>;

export const removeOrganizationMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type RemoveOrganizationMemberInput = z.infer<typeof removeOrganizationMemberSchema>;

export const listOrganizationsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: organizationTypeEnum.optional(),
});

export type ListOrganizationsInput = z.infer<typeof listOrganizationsSchema>;

export const getOrganizationSchema = z.object({
  id: z.string().uuid(),
});

export type GetOrganizationInput = z.infer<typeof getOrganizationSchema>;
