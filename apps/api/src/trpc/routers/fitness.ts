import { STREAK_TYPE, XP_POINTS } from '@pawmeet/config';
import { isSuccess } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import {
  addTrackPointsSchema,
  endTrackingSchema,
  getActivityStatsSchema,
  getDogHealthGoalSchema,
  getTrackSchema,
  getUserTracksSchema,
  startTrackingSchema,
  syncHealthDataSchema,
} from '@pawmeet/validation';
import type { fitnessDeps } from '../../container/index.js';
import { trackEvent } from '../../lib/track-event.js';
import { protectedProcedure, router, unwrapResult } from '../trpc.js';

export function createFitnessRouter(deps: typeof fitnessDeps) {
  return router({
    // ── Walk tracking ─────────────────────────────────────────────────────────

    startTracking: protectedProcedure
      .input(startTrackingSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.startWalkTracking(ctx.userId, { walkId: input.walkId ?? null })),
      ),

    addPoints: protectedProcedure.input(addTrackPointsSchema).mutation(async ({ ctx, input }) =>
      unwrapResult(
        await deps.addTrackPoints(ctx.userId, {
          trackId: input.trackId,
          points: input.points,
        }),
      ),
    ),

    endTracking: protectedProcedure.input(endTrackingSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(
        await deps.endWalkTracking(ctx.userId, { trackId: input.trackId }),
      );
      trackEvent('walk_completed', ctx.userId, {
        durationMinutes: result.track.durationMinutes ?? 0,
        distanceKm: result.track.distanceKm ?? 0,
        participantCount: 1,
      });

      // Gamification: challenge progress + achievements (fire and forget)
      void deps
        .updateChallengeProgress(ctx.userId, 'walk_count', 1)
        .catch((e) => logger.warn('gamification', 'Side effect failed', e));
      void deps
        .updateChallengeProgress(ctx.userId, 'walk_distance_km', result.track.distanceKm ?? 0)
        .catch((e) => logger.warn('gamification', 'Side effect failed', e));
      void deps
        .checkAndUnlockAchievements(ctx.userId)
        .catch((e) => logger.warn('gamification', 'Side effect failed', e));

      // Update daily walk streak (fire and forget)
      void deps
        .updateStreak(ctx.userId, STREAK_TYPE.DAILY_WALK)
        .then((streakResult) => {
          if (isSuccess(streakResult) && streakResult.data.broken) {
            trackEvent('gamification_streak_broken', ctx.userId, {
              streakLength: streakResult.data.streak.longestLength,
              streakType: STREAK_TYPE.DAILY_WALK,
            });
          }
        })
        .catch((e) => logger.warn('gamification', 'Streak update failed', e));
      trackEvent('gamification_xp_awarded', ctx.userId, {
        amount: XP_POINTS.walk_tracked,
        source: 'walk_tracked',
      });

      // Auto-create walk album if the track is linked to a walk
      if (result.track.walkId) {
        const albumResult = await deps.createWalkAlbum(result.track.walkId, 'Album passeggiata');
        if (isSuccess(albumResult)) {
          trackEvent('feed_walk_album_created', ctx.userId, {
            walkId: result.track.walkId,
          });
        } else {
          // Album already exists or other error — not critical
          logger.info('FitnessRouter', `Walk album not created: ${albumResult.error.code}`);
        }
      }

      return result;
    }),

    getTrack: protectedProcedure
      .input(getTrackSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getWalkTrack(ctx.userId, { trackId: input.trackId })),
      ),

    userTracks: protectedProcedure
      .input(getUserTracksSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getUserTracks(ctx.userId, input.cursor ?? null, input.limit)),
      ),

    // ── Health data ───────────────────────────────────────────────────────────

    syncHealthData: protectedProcedure
      .input(syncHealthDataSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.syncHealthData(ctx.userId, { entries: input.entries })),
      ),

    getStats: protectedProcedure
      .input(getActivityStatsSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(
          await deps.getActivityStats(ctx.userId, { period: input.period, date: input.date }),
        ),
      ),

    getDogGoal: protectedProcedure
      .input(getDogHealthGoalSchema)
      .query(async ({ ctx, input }) =>
        unwrapResult(await deps.getDogHealthGoal(ctx.userId, { dogId: input.dogId })),
      ),
  });
}
