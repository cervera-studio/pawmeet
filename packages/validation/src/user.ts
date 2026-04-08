import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@pawmeet/config';
import { z } from 'zod';
import { dateOfBirthSchema } from './auth';
import { latitudeSchema, longitudeSchema } from './value-objects';

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  avatarUrl: z.url().nullable().optional(),
  latitude: latitudeSchema.nullable().optional(),
  longitude: longitudeSchema.nullable().optional(),
  searchRadiusKm: z.number().min(1).max(50).optional(),
});

export const updateLocationSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  force: z.boolean().optional(),
});

export const updatePreferencesSchema = z.object({
  searchRadiusKm: z.number().min(MIN_SEARCH_RADIUS_KM).max(MAX_SEARCH_RADIUS_KM),
});

export const nearbySchema = z.object({
  radiusKm: z.number().min(MIN_SEARCH_RADIUS_KM).max(MAX_SEARCH_RADIUS_KM).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  offset: z.number().int().min(0).optional(),
});

export const confirmUploadSchema = z.object({
  key: z.string().min(1),
});

export const registerPushTokenSchema = z.object({
  token: z.string().regex(/^ExponentPushToken\[.+\]$/, 'invalid_push_token'),
});

export const updateNotificationPrefsSchema = z.object({
  matches: z.boolean().optional(),
  messages: z.boolean().optional(),
  reminders: z.boolean().optional(),
  feed: z.boolean().optional(),
  nearby: z.boolean().optional(),
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'time_format')
    .nullable()
    .optional(),
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'time_format')
    .nullable()
    .optional(),
  timezone: z.string().max(50).nullable().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type NearbyInput = z.infer<typeof nearbySchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;

export const updatePrivacyPrefsSchema = z.object({
  profileVisible: z.boolean().optional(),
  approximateDistance: z.boolean().optional(),
  showLastSeen: z.boolean().optional(),
});

export type UpdatePrivacyPrefsInput = z.infer<typeof updatePrivacyPrefsSchema>;

export const submitDateOfBirthSchema = z.object({
  dateOfBirth: dateOfBirthSchema,
});

export type SubmitDateOfBirthInput = z.infer<typeof submitDateOfBirthSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'delete_account_password_required'),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

export const reactivateAccountSchema = z.object({
  password: z.string().min(1, 'reactivate_account_password_required'),
});

export type ReactivateAccountInput = z.infer<typeof reactivateAccountSchema>;

export const getPublicProfileSchema = z.object({
  userId: z.string().uuid(),
});

export type GetPublicProfileInput = z.infer<typeof getPublicProfileSchema>;
