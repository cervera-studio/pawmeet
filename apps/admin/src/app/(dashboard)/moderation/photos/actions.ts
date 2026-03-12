'use server';

import { revalidatePath } from 'next/cache';
import { serverFetch } from '@/lib/server-api';

export async function approvePhoto(photoId: string): Promise<void> {
  await serverFetch(`/admin/moderation/photos/${photoId}/approve`, { method: 'POST' });
  revalidatePath('/moderation/photos');
}

export async function rejectPhoto(photoId: string): Promise<void> {
  await serverFetch(`/admin/moderation/photos/${photoId}/reject`, { method: 'POST' });
  revalidatePath('/moderation/photos');
}

export async function approveAllPhotos(): Promise<void> {
  await serverFetch('/admin/moderation/photos/approve-all', { method: 'POST' });
  revalidatePath('/moderation/photos');
}
