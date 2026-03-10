import { MAX_PHOTOS_PER_DOG } from '@dogwalk/config';
import { createDogSchema, updateDogSchema } from '@dogwalk/validation';
import { z } from 'zod';
import type { dogDeps } from '../../container.js';
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE } from '../../lib/storage.js';
import { protectedProcedure, publicProcedure, router, unwrapResult } from '../trpc.js';

const breedsSearchSchema = z.object({ q: z.string().min(1).max(100).optional() });

const photoUploadUrlSchema = z.object({
  dogId: z.string().uuid(),
  contentType: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

const photoConfirmSchema = z.object({
  dogId: z.string().uuid(),
  key: z.string().min(1),
});

const photoDeleteSchema = z.object({
  dogId: z.string().uuid(),
  photoId: z.string().uuid(),
});

const photoReorderSchema = z.object({
  dogId: z.string().uuid(),
  photoIds: z.array(z.string().uuid()).min(1).max(MAX_PHOTOS_PER_DOG),
});

export function createDogsRouter(deps: typeof dogDeps) {
  return router({
    searchBreeds: publicProcedure
      .input(breedsSearchSchema)
      .query(async ({ input }) => unwrapResult(await deps.searchBreeds(input.q))),

    list: protectedProcedure
      .query(async ({ ctx }) => unwrapResult(await deps.listUserDogs(ctx.userId))),

    create: protectedProcedure
      .input(createDogSchema)
      .mutation(async ({ ctx, input }) => unwrapResult(await deps.createDog(ctx.userId, input))),

    get: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async ({ input }) => unwrapResult(await deps.getDog(input.id))),

    update: protectedProcedure
      .input(z.object({ id: z.string().uuid(), data: updateDogSchema }))
      .mutation(async ({ ctx, input }) => unwrapResult(await deps.updateDog(input.id, ctx.userId, input.data))),

    delete: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => unwrapResult(await deps.deleteDog(input.id, ctx.userId))),

    uploadPhotoUrl: protectedProcedure
      .input(photoUploadUrlSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.uploadDogPhotoUrl(input.dogId, ctx.userId, input.contentType)),
      ),

    confirmPhoto: protectedProcedure
      .input(photoConfirmSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.confirmDogPhoto(input.dogId, ctx.userId, input.key)),
      ),

    deletePhoto: protectedProcedure
      .input(photoDeleteSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.deleteDogPhoto(input.dogId, input.photoId, ctx.userId)),
      ),

    reorderPhotos: protectedProcedure
      .input(photoReorderSchema)
      .mutation(async ({ ctx, input }) =>
        unwrapResult(await deps.reorderDogPhotos(input.dogId, ctx.userId, input.photoIds)),
      ),
  });
}
