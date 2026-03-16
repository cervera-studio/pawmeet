'use server';

import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchChallenges(params: { page: number; pageSize: number }) {
  const api = await getServerTrpcClient();
  return api.admin.listChallenges.query(params);
}

export async function createChallenge(data: {
  type: 'walk_count' | 'walk_distance_km' | 'new_matches' | 'group_events_joined';
  title: string;
  description: string;
  targetValue: number;
  xpReward: number;
  startsAt: string;
  endsAt: string;
}) {
  const api = await getServerTrpcClient();
  return api.admin.createChallenge.mutate(data);
}

export async function deleteChallenge(data: { challengeId: string }) {
  const api = await getServerTrpcClient();
  return api.admin.deleteChallenge.mutate(data);
}
