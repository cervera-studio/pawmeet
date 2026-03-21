import { ADMIN_WS_EVENT } from '@pawmeet/types';
import {
  analyzeDogPhotoSchema,
  breedsSearchSchema,
  createDogSchema,
  generateDogBioSchema,
  photoReorderSchema,
  updateDogSchema,
} from '@pawmeet/validation';
import { Ratelimit } from '@upstash/ratelimit';
import { z } from 'zod';
import type { dogDeps } from '../../container/index.js';
import { enqueueEmbeddingGeneration } from '../../jobs/queue.js';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../../lib/storage.js';
import { trackEvent } from '../../lib/track-event.js';
import { sendToAllAdmins } from '../../ws/admin-ws.js';
import { protectedProcedure, publicProcedure, router, unwrapResult } from '../trpc.js';

const photoUploadUrlSchema = z.object({
  dogId: z.uuid(),
  contentType: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

const photoConfirmSchema = z.object({
  dogId: z.uuid(),
  key: z.string().min(1),
});

const photoDeleteSchema = z.object({
  dogId: z.uuid(),
  photoId: z.uuid(),
});

let _photoAnalysisRateLimiter: Ratelimit | null = null;

async function getPhotoAnalysisRateLimiter(): Promise<Ratelimit> {
  if (!_photoAnalysisRateLimiter) {
    const { redis } = await import('../../lib/redis.js');
    _photoAnalysisRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '24h'),
      prefix: 'rl:trpc:dog-photo-analysis',
    });
  }
  return _photoAnalysisRateLimiter;
}

let _bioRateLimiter: Ratelimit | null = null;

async function getBioRateLimiter(): Promise<Ratelimit> {
  if (!_bioRateLimiter) {
    const { redis } = await import('../../lib/redis.js');
    _bioRateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '24h'),
      prefix: 'rl:trpc:dog-bio',
    });
  }
  return _bioRateLimiter;
}

export function createDogsRouter(deps: typeof dogDeps) {
  return router({
    searchBreeds: publicProcedure
      .input(breedsSearchSchema)
      .query(async ({ input }) => unwrapResult(await deps.searchBreeds(input.q))),

    getPublicProfile: publicProcedure
      .input(z.object({ id: z.uuid() }))
      .query(async ({ input }) => unwrapResult(await deps.getPublicDogProfile(input.id))),

    list: protectedProcedure.query(async ({ ctx }) =>
      unwrapResult(await deps.listUserDogs(ctx.userId)),
    ),

    create: protectedProcedure.input(createDogSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.createDog(ctx.userId, input));
      trackEvent('dog_profile_created', ctx.userId, {
        breed: input.breed,
        size: input.size,
        energyLevel: input.energyLevel,
        photoCount: 0,
        isNeutered: input.isNeutered,
      });
      enqueueEmbeddingGeneration({ dogId: result.dog.id, trigger: 'create' });
      return result;
    }),

    get: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .query(async ({ input }) => unwrapResult(await deps.getDog(input.id))),

    update: protectedProcedure
      .input(z.object({ id: z.uuid(), data: updateDogSchema }))
      .mutation(async ({ ctx, input }) => {
        const result = unwrapResult(await deps.updateDog(input.id, ctx.userId, input.data));
        trackEvent('dog_profile_updated', ctx.userId, {
          fieldsChanged: Object.keys(input.data),
        });
        enqueueEmbeddingGeneration({ dogId: input.id, trigger: 'update' });
        return result;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.uuid() }))
      .mutation(async ({ ctx, input }) => unwrapResult(await deps.deleteDog(input.id, ctx.userId))),

    uploadPhotoUrl: protectedProcedure
      .input(photoUploadUrlSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.uploadDogPhotoUrl(input.dogId, ctx.userId, input.contentType)),
      ),

    confirmPhoto: protectedProcedure.input(photoConfirmSchema).mutation(async ({ ctx, input }) => {
      const result = unwrapResult(await deps.confirmDogPhoto(input.dogId, ctx.userId, input.key));
      trackEvent('dog_photo_uploaded', ctx.userId, {
        position: result.photo.position,
        fileSizeKb: 0, // size not available at confirm step
      });
      sendToAllAdmins({
        type: ADMIN_WS_EVENT.MODERATION_NEW_PHOTO,
        payload: { photoId: result.photo.id },
      });
      return result;
    }),

    deletePhoto: protectedProcedure
      .input(photoDeleteSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.deleteDogPhoto(input.dogId, input.photoId, ctx.userId)),
      ),

    reorderPhotos: protectedProcedure
      .input(z.object({ dogId: z.uuid(), photoIds: photoReorderSchema.shape.photoIds }))
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.reorderDogPhotos(input.dogId, ctx.userId, input.photoIds)),
      ),

    generateBio: protectedProcedure.input(generateDogBioSchema).mutation(async ({ ctx, input }) => {
      const limiter = await getBioRateLimiter();
      const { success } = await limiter.limit(ctx.userId);
      if (!success) {
        throw new (await import('@trpc/server')).TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: 'Daily bio generation limit reached. Try again tomorrow.',
        });
      }

      const result = unwrapResult(await deps.generateDogBio(input));
      trackEvent('dog_bio_generated', ctx.userId, {
        breed: input.breed,
        size: input.size,
      });
      return result;
    }),

    analyzePhoto: protectedProcedure
      .input(analyzeDogPhotoSchema)
      .mutation(async ({ ctx, input }) => {
        const limiter = await getPhotoAnalysisRateLimiter();
        const { success } = await limiter.limit(ctx.userId);
        if (!success) {
          throw new (await import('@trpc/server')).TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: 'Daily photo analysis limit reached. Try again tomorrow.',
          });
        }

        const result = unwrapResult(await deps.analyzeDogPhoto(input.imageBase64, input.mimeType));
        trackEvent('dog_photo_analyzed', ctx.userId, {
          breed: result.analysis.breed,
          size: result.analysis.size,
          confidence: result.analysis.confidence,
        });
        return result;
      }),
  });
}
