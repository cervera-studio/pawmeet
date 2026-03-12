import {
  breedsSearchSchema,
  createDogSchema,
  photoReorderSchema,
  updateDogSchema,
} from '@pawmeet/validation';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { dogDeps as DogDeps } from '../container.js';
import { handleResult } from '../lib/result.js';
import { ALLOWED_IMAGE_TYPES_TUPLE, MAX_FILE_SIZE } from '../lib/storage.js';
import { uuidParamOrBail } from '../lib/validate-param.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

const photoUploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES_TUPLE),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

const photoConfirmSchema = z.object({
  key: z.string().min(1),
});

export function createDogRoutes(deps: typeof DogDeps) {
  return new Hono<Env>()
    .get('/breeds', zValidator('query', breedsSearchSchema), async (c) => {
      const { q } = c.req.valid('query');
      const result = await deps.searchBreeds(q);
      return handleResult(c, result);
    })

    .use('/*', authMiddleware)

    .get('/', async (c) => {
      const userId = c.get('userId');
      const result = await deps.listUserDogs(userId);
      return handleResult(c, result);
    })

    .post('/', zValidator('json', createDogSchema), async (c) => {
      const userId = c.get('userId');
      const input = c.req.valid('json');
      const result = await deps.createDog(userId, input);
      return handleResult(c, result, 201);
    })

    .get('/:id', async (c) => {
      const dogId = uuidParamOrBail(c, 'id');
      const result = await deps.getDog(dogId);
      return handleResult(c, result);
    })

    .put('/:id', zValidator('json', updateDogSchema), async (c) => {
      const userId = c.get('userId');
      const dogId = uuidParamOrBail(c, 'id');
      const input = c.req.valid('json');
      const result = await deps.updateDog(dogId, userId, input);
      return handleResult(c, result);
    })

    .delete('/:id', async (c) => {
      const userId = c.get('userId');
      const dogId = uuidParamOrBail(c, 'id');
      const result = await deps.deleteDog(dogId, userId);
      return handleResult(c, result);
    })

    .post('/:id/photos/upload-url', zValidator('json', photoUploadUrlSchema), async (c) => {
      const userId = c.get('userId');
      const dogId = uuidParamOrBail(c, 'id');
      const { contentType } = c.req.valid('json');
      const result = await deps.uploadDogPhotoUrl(dogId, userId, contentType);
      return handleResult(c, result);
    })

    .post('/:id/photos/confirm', zValidator('json', photoConfirmSchema), async (c) => {
      const userId = c.get('userId');
      const dogId = uuidParamOrBail(c, 'id');
      const { key } = c.req.valid('json');
      const result = await deps.confirmDogPhoto(dogId, userId, key);
      return handleResult(c, result, 201);
    })

    .delete('/:id/photos/:photoId', async (c) => {
      const userId = c.get('userId');
      const dogId = uuidParamOrBail(c, 'id');
      const photoId = uuidParamOrBail(c, 'photoId');
      const result = await deps.deleteDogPhoto(dogId, photoId, userId);
      return handleResult(c, result);
    })

    .put('/:id/photos/reorder', zValidator('json', photoReorderSchema), async (c) => {
      const userId = c.get('userId');
      const dogId = uuidParamOrBail(c, 'id');
      const { photoIds } = c.req.valid('json');
      const result = await deps.reorderDogPhotos(dogId, userId, photoIds);
      return handleResult(c, result);
    });
}
