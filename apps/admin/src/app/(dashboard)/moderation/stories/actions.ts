'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AdminStoryPage } from '@/repositories';

export async function deleteStory(storyId: string): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.deleteStory.mutate({ storyId });
  revalidatePath('/moderation/stories');
}

export async function fetchStories(params: {
  page: number;
  pageSize: number;
}): Promise<AdminStoryPage> {
  const api = await getServerTrpcClient();
  return api.admin.listStories.query(params);
}
