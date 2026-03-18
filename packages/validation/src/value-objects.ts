import { z } from 'zod';

// ── Email ────────────────────────────────────────────────────────────────────

/**
 * Normalized, validated email address.
 * Always stored and compared in lowercase.
 */
export const emailSchema = z
  .string()
  .email('email_invalid')
  .max(255)
  .transform((v) => v.toLowerCase())
  .brand<'Email'>();

export type Email = z.output<typeof emailSchema>;

// ── Coordinates ──────────────────────────────────────────────────────────────

/**
 * Geographic coordinate pair (WGS84).
 * Latitude: -90..90, Longitude: -180..180.
 */
export const coordinatesSchema = z
  .object({
    latitude: z.number().min(-90, 'latitude_out_of_range').max(90, 'latitude_out_of_range'),
    longitude: z.number().min(-180, 'longitude_out_of_range').max(180, 'longitude_out_of_range'),
  })
  .brand<'Coordinates'>();

export type Coordinates = z.output<typeof coordinatesSchema>;

// ── CompatibilityScore ───────────────────────────────────────────────────────

/**
 * Compatibility score between two dogs. Always in range [0, 1].
 */
export const compatibilityScoreSchema = z
  .number()
  .min(0, 'score_min_zero')
  .max(1, 'score_max_one')
  .brand<'CompatibilityScore'>();

export type CompatibilityScore = z.output<typeof compatibilityScoreSchema>;

// ── MatchWeights ─────────────────────────────────────────────────────────────

/**
 * Matching algorithm weight distribution.
 * All values in [0, 1], sum must equal 1 (±0.001 tolerance for floating-point).
 */
export const matchWeightsSchema = z
  .object({
    size: z.number().min(0).max(1),
    energy: z.number().min(0).max(1),
    behavior: z.number().min(0).max(1),
    walk: z.number().min(0).max(1),
    distance: z.number().min(0).max(1),
    leash: z.number().min(0).max(1),
  })
  .refine(
    (w) => {
      const sum = w.size + w.energy + w.behavior + w.walk + w.distance + w.leash;
      return Math.abs(sum - 1) <= 0.001;
    },
    { message: 'weights_must_sum_to_one' },
  )
  .brand<'MatchWeights'>();

export type MatchWeights = z.output<typeof matchWeightsSchema>;

export function parseMatchWeights(weights: {
  size: number;
  energy: number;
  behavior: number;
  walk: number;
  distance: number;
  leash: number;
}): MatchWeights {
  return matchWeightsSchema.parse(weights);
}

export function safeParseMatchWeights(weights: Record<string, number>) {
  return matchWeightsSchema.safeParse(weights);
}
