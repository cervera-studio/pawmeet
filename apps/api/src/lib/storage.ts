import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_BUCKET = process.env.R2_BUCKET || 'pawmeet';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

/** Allowed image MIME types for uploads */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

/** Zod-compatible tuple version for use in z.enum() */
export const ALLOWED_IMAGE_TYPES_TUPLE: [string, ...string[]] = [...ALLOWED_IMAGE_TYPES];

/** Allowed video MIME types for uploads */
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;

export type AllowedVideoType = (typeof ALLOWED_VIDEO_TYPES)[number];

/** All allowed media types (images + videos) */
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES] as const;

export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

/** Max file size in bytes (5 MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Max video file size in bytes (100 MB) */
export const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024;

/** Presigned URL expiry in seconds (10 minutes) */
const PRESIGNED_EXPIRY = 600;

/** Lazy-load the R2 client to avoid env-var checks at import time */
async function getR2() {
  const { r2 } = await import('./r2.js');
  return r2;
}

/**
 * Build the R2 object key for a user avatar.
 * Format: avatars/{userId}/{timestamp}.{ext}
 */
export function buildAvatarKey(userId: string, contentType: AllowedImageType): string {
  const ext = contentType.split('/')[1];
  return `avatars/${userId}/${Date.now()}.${ext}`;
}

/**
 * Build the R2 object key for a dog photo.
 * Format: dogs/{dogId}/{timestamp}.{ext}
 */
export function buildDogPhotoKey(dogId: string, contentType: AllowedImageType): string {
  const ext = contentType.split('/')[1];
  return `dogs/${dogId}/${Date.now()}.${ext}`;
}

/**
 * Build the R2 object key for a post media file.
 * Format: posts/{postId}/{timestamp}.{ext}
 */
export function buildPostMediaKey(postId: string, contentType: AllowedMediaType): string {
  const ext = contentType.split('/')[1];
  return `posts/${postId}/${Date.now()}.${ext}`;
}

/**
 * Build the R2 object key for a story media file.
 * Format: stories/{userId}/{timestamp}.{ext}
 */
export function buildStoryMediaKey(userId: string, contentType: AllowedMediaType): string {
  const ext = contentType.split('/')[1];
  return `stories/${userId}/${Date.now()}.${ext}`;
}

/**
 * Generate a presigned PUT URL for a given key.
 * Returns the presigned URL and the object key.
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: AllowedImageType,
): Promise<string> {
  const r2 = await getR2();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2, command, { expiresIn: PRESIGNED_EXPIRY });
}

/**
 * Generate a presigned PUT URL for uploading an avatar to R2.
 * Returns the presigned URL and the object key.
 */
export async function generateUploadUrl(
  userId: string,
  contentType: AllowedImageType,
): Promise<{ uploadUrl: string; key: string }> {
  const key = buildAvatarKey(userId, contentType);
  const r2 = await getR2();

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: PRESIGNED_EXPIRY });
  return { uploadUrl, key };
}

/**
 * Generate a presigned GET URL for reading an avatar from R2.
 */
export async function generateReadUrl(key: string): Promise<string> {
  const r2 = await getR2();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn: PRESIGNED_EXPIRY });
}

/**
 * Upload an object to R2 from the server side (not presigned).
 */
export async function uploadObject(key: string, body: string, contentType: string): Promise<void> {
  const r2 = await getR2();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await r2.send(command);
}

/**
 * Generate a presigned GET URL with configurable expiry.
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
): Promise<string> {
  const r2 = await getR2();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}

/**
 * Delete an object from R2 by its key.
 */
export async function deleteObject(key: string): Promise<void> {
  const r2 = await getR2();

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
  });

  await r2.send(command);
}

/**
 * Build the public URL for an R2 object.
 * Falls back to the key itself if R2_PUBLIC_URL is not configured.
 */
export function getPublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    return key;
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Extract the R2 key from a public URL or return the key as-is.
 */
export function extractKeyFromUrl(url: string): string {
  if (R2_PUBLIC_URL && url.startsWith(R2_PUBLIC_URL)) {
    return url.slice(R2_PUBLIC_URL.length + 1);
  }
  return url;
}
