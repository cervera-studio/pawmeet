'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { FeedPostPage, FeedStats } from '@/repositories';

export async function moderatePost(postId: string, status: 'approved' | 'rejected'): Promise<void> {
  const api = await getServerTrpcClient();
  await api.admin.updatePostModeration.mutate({ postId, status });
  revalidatePath('/moderation/feed');
}

export async function fetchFeedPosts(params: {
  page: number;
  pageSize: number;
  status?: 'pending' | 'approved' | 'rejected';
  search?: string;
}): Promise<FeedPostPage> {
  const api = await getServerTrpcClient();
  return api.admin.listFeedPosts.query(params);
}

export async function fetchFeedStats(): Promise<FeedStats> {
  const api = await getServerTrpcClient();
  return api.admin.getFeedStats.query();
}
