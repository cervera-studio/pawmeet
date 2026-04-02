import { z } from 'zod';
import { latitudeSchema, longitudeSchema } from './value-objects';

export const startTrackingSchema = z.object({
  walkId: z.uuid().nullable().optional(),
});

export const trackPointSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  altitude: z.number().nullable().optional(),
  timestamp: z.iso.datetime(),
  speedKmh: z.number().min(0).nullable().optional(),
});

export const addTrackPointsSchema = z.object({
  trackId: z.uuid(),
  points: z.array(trackPointSchema).min(1).max(50),
});

export const endTrackingSchema = z.object({
  trackId: z.uuid(),
});

export const getTrackSchema = z.object({
  trackId: z.uuid(),
});

export const syncHealthDataSchema = z.object({
  entries: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        stepsCount: z.number().int().min(0),
        walkDistanceKm: z.number().min(0),
        walkDurationMin: z.number().min(0),
        walkCount: z.number().int().min(0),
        source: z.enum(['health_kit', 'google_fit']),
      }),
    )
    .min(1)
    .max(30),
});

export const getActivityStatsSchema = z.object({
  period: z.enum(['week', 'month']),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const getDogHealthGoalSchema = z.object({
  dogId: z.uuid(),
});

export const getUserTracksSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});
