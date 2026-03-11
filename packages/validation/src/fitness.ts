import { z } from 'zod';

export const startTrackingSchema = z.object({
  walkId: z.string().uuid().nullable().optional(),
});

export const trackPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().nullable().optional(),
  timestamp: z.string().datetime(),
  speedKmh: z.number().min(0).nullable().optional(),
});

export const addTrackPointsSchema = z.object({
  trackId: z.string().uuid(),
  points: z.array(trackPointSchema).min(1).max(50),
});

export const endTrackingSchema = z.object({
  trackId: z.string().uuid(),
});

export const getTrackSchema = z.object({
  trackId: z.string().uuid(),
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
  dogId: z.string().uuid(),
});

export const getUserTracksSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});
