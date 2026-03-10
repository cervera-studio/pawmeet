import { MAX_DOGS_PER_USER, MAX_PHOTOS_PER_DOG } from '@dogwalk/config';
import { breeds, dogPhotos, dogProfiles } from '@dogwalk/db';
import { createDogSchema, updateDogSchema } from '@dogwalk/validation';
import { zValidator } from '@hono/zod-validator';
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db.js';
import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
  buildDogPhotoKey,
  deleteObject,
  extractKeyFromUrl,
  generatePresignedUploadUrl,
  getPublicUrl,
  MAX_FILE_SIZE,
} from '../lib/storage.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

// --- Validation schemas for photo endpoints ---

const photoUploadUrlSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES as unknown as [string, ...string[]]),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
});

const photoConfirmSchema = z.object({
  key: z.string().min(1),
});

const photoReorderSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(MAX_PHOTOS_PER_DOG),
});

const breedsSearchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
});

// --- Helper: check dog ownership ---

async function getOwnedDog(dogId: string, userId: string) {
  const [dog] = await db
    .select()
    .from(dogProfiles)
    .where(and(eq(dogProfiles.id, dogId), eq(dogProfiles.ownerId, userId)));
  return dog ?? null;
}

export const dogRoutes = new Hono<Env>()
  /** Search dog breeds by name (English or Italian). Public endpoint, no auth required. */
  .get('/breeds', zValidator('query', breedsSearchSchema), async (c) => {
    const { q } = c.req.valid('query');

    if (!q) {
      const allBreeds = await db.select().from(breeds).orderBy(asc(breeds.nameIt));
      return c.json({ breeds: allBreeds });
    }

    // Search by name (English or Italian), case-insensitive
    const pattern = `%${q}%`;
    const results = await db
      .select()
      .from(breeds)
      .where(or(ilike(breeds.name, pattern), ilike(breeds.nameIt, pattern)))
      .orderBy(asc(breeds.nameIt))
      .limit(20);

    return c.json({ breeds: results });
  })

  // All routes below require auth
  .use('/*', authMiddleware)

  /** List current user's active dog profiles. */
  .get('/', async (c) => {
    const userId = c.get('userId');

    const dogs = await db
      .select()
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    return c.json({ dogs });
  })

  /** Create a new dog profile. Enforces MAX_DOGS_PER_USER (5) limit. */
  .post('/', zValidator('json', createDogSchema), async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    // Check max dogs limit
    const existing = await db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(and(eq(dogProfiles.ownerId, userId), eq(dogProfiles.isActive, true)));

    if (existing.length >= MAX_DOGS_PER_USER) {
      return c.json({ error: `Puoi registrare al massimo ${MAX_DOGS_PER_USER} cani` }, 400);
    }

    const rows = await db
      .insert(dogProfiles)
      .values({
        ...input,
        ownerId: userId,
      })
      .returning();

    const dog = rows[0];
    if (!dog) {
      return c.json({ error: 'Errore durante la creazione del profilo' }, 500);
    }

    return c.json({ dog }, 201);
  })

  /** Get a single dog profile with its photo gallery, ordered by position. */
  .get('/:id', async (c) => {
    const dogId = c.req.param('id');

    const [dog] = await db.select().from(dogProfiles).where(eq(dogProfiles.id, dogId));

    if (!dog || !dog.isActive) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    const photos = await db
      .select()
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId))
      .orderBy(asc(dogPhotos.position));

    return c.json({ dog, photos });
  })

  /** Update a dog profile (partial update). Owner only. */
  .put('/:id', zValidator('json', updateDogSchema), async (c) => {
    const userId = c.get('userId');
    const dogId = c.req.param('id');
    const input = c.req.valid('json');

    const dog = await getOwnedDog(dogId, userId);
    if (!dog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    const rows = await db
      .update(dogProfiles)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(dogProfiles.id, dogId))
      .returning();

    return c.json({ dog: rows[0] });
  })

  /** Soft-delete a dog profile (sets isActive=false). Owner only. */
  .delete('/:id', async (c) => {
    const userId = c.get('userId');
    const dogId = c.req.param('id');

    const dog = await getOwnedDog(dogId, userId);
    if (!dog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    await db
      .update(dogProfiles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dogProfiles.id, dogId));

    return c.json({ message: 'Profilo cane eliminato' });
  })

  /** Get presigned URL to upload a dog photo to R2. Max 6 photos per dog. */
  .post('/:id/photos/upload-url', zValidator('json', photoUploadUrlSchema), async (c) => {
    const userId = c.get('userId');
    const dogId = c.req.param('id');

    const dog = await getOwnedDog(dogId, userId);
    if (!dog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    // Check max photos limit
    const existingPhotos = await db
      .select({ id: dogPhotos.id })
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId));

    if (existingPhotos.length >= MAX_PHOTOS_PER_DOG) {
      return c.json({ error: `Puoi caricare al massimo ${MAX_PHOTOS_PER_DOG} foto per cane` }, 400);
    }

    const { contentType } = c.req.valid('json');
    const key = buildDogPhotoKey(dogId, contentType as AllowedImageType);
    const uploadUrl = await generatePresignedUploadUrl(key, contentType as AllowedImageType);

    return c.json({ uploadUrl, key });
  })

  /** Confirm a dog photo upload. First photo becomes primary automatically. */
  .post('/:id/photos/confirm', zValidator('json', photoConfirmSchema), async (c) => {
    const userId = c.get('userId');
    const dogId = c.req.param('id');

    const dog = await getOwnedDog(dogId, userId);
    if (!dog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    const { key } = c.req.valid('json');

    // Validate the key belongs to this dog
    if (!key.startsWith(`dogs/${dogId}/`)) {
      return c.json({ error: 'Chiave non valida' }, 403);
    }

    // Get current photo count to determine position
    const existingPhotos = await db
      .select({ id: dogPhotos.id })
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId));

    if (existingPhotos.length >= MAX_PHOTOS_PER_DOG) {
      return c.json({ error: `Puoi caricare al massimo ${MAX_PHOTOS_PER_DOG} foto per cane` }, 400);
    }

    const position = existingPhotos.length;
    const isPrimary = position === 0;
    const publicUrl = getPublicUrl(key);

    const rows = await db
      .insert(dogPhotos)
      .values({
        dogId,
        url: publicUrl,
        position,
        isPrimary,
      })
      .returning();

    return c.json({ photo: rows[0] }, 201);
  })

  /** Delete a dog photo from R2 and DB. Reorders remaining photos. */
  .delete('/:id/photos/:photoId', async (c) => {
    const userId = c.get('userId');
    const dogId = c.req.param('id');
    const photoId = c.req.param('photoId');

    const dog = await getOwnedDog(dogId, userId);
    if (!dog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    const [photo] = await db
      .select()
      .from(dogPhotos)
      .where(and(eq(dogPhotos.id, photoId), eq(dogPhotos.dogId, dogId)));

    if (!photo) {
      return c.json({ error: 'Foto non trovata' }, 404);
    }

    // Delete from R2
    const key = extractKeyFromUrl(photo.url);
    try {
      await deleteObject(key);
    } catch {
      // Object may already be gone
    }

    // Delete from DB
    await db.delete(dogPhotos).where(eq(dogPhotos.id, photoId));

    // Reorder remaining photos
    const remaining = await db
      .select()
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId))
      .orderBy(asc(dogPhotos.position));

    for (let i = 0; i < remaining.length; i++) {
      const p = remaining[i]!;
      await db
        .update(dogPhotos)
        .set({ position: i, isPrimary: i === 0 })
        .where(eq(dogPhotos.id, p.id));
    }

    return c.json({ message: 'Foto eliminata' });
  })

  /** Reorder dog photos. First photo in the array becomes primary. */
  .put('/:id/photos/reorder', zValidator('json', photoReorderSchema), async (c) => {
    const userId = c.get('userId');
    const dogId = c.req.param('id');

    const dog = await getOwnedDog(dogId, userId);
    if (!dog) {
      return c.json({ error: 'Profilo cane non trovato' }, 404);
    }

    const { photoIds } = c.req.valid('json');

    // Verify all photo IDs belong to this dog
    const existingPhotos = await db
      .select({ id: dogPhotos.id })
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId));

    const existingIds = new Set(existingPhotos.map((p) => p.id));
    const allValid = photoIds.every((id) => existingIds.has(id));

    if (!allValid || photoIds.length !== existingPhotos.length) {
      return c.json({ error: 'Lista foto non valida' }, 400);
    }

    // Update positions
    for (let i = 0; i < photoIds.length; i++) {
      await db
        .update(dogPhotos)
        .set({ position: i, isPrimary: i === 0 })
        .where(eq(dogPhotos.id, photoIds[i]!));
    }

    // Return updated photos
    const updated = await db
      .select()
      .from(dogPhotos)
      .where(eq(dogPhotos.dogId, dogId))
      .orderBy(asc(dogPhotos.position));

    return c.json({ photos: updated });
  });
