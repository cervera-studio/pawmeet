import { MAX_SEARCH_RADIUS_KM, MIN_SEARCH_RADIUS_KM } from '@pawmeet/config';
import { z } from 'zod';
import { dateOfBirthSchema } from './auth';

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  searchRadiusKm: z.number().min(1).max(50).optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
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
  token: z.string().min(1),
});

export const updateNotificationPrefsSchema = z.object({
  matches: z.boolean().optional(),
  messages: z.boolean().optional(),
  reminders: z.boolean().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type NearbyInput = z.infer<typeof nearbySchema>;
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export type UpdateNotificationPrefsInput = z.infer<typeof updateNotificationPrefsSchema>;

export const submitDateOfBirthSchema = z.object({
  dateOfBirth: dateOfBirthSchema,
});

export type SubmitDateOfBirthInput = z.infer<typeof submitDateOfBirthSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password richiesta per confermare la cancellazione'),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
