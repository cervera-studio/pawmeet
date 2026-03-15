'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchPendingPhotos() {
  const api = await getServerTrpcClient();
  return api.admin.listPendingPhotos.query();
}

export async function approvePhoto(photoId: string): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.approvePhoto.mutate({ photoId });
  revalidatePath('/moderation/photos');
}

export async function rejectPhoto(photoId: string): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.rejectPhoto.mutate({ photoId });
  revalidatePath('/moderation/photos');
}

export async function approveAllPhotos(): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.approveAllPhotos.mutate();
  revalidatePath('/moderation/photos');
}
