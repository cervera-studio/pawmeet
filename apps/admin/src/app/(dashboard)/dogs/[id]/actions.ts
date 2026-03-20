'use server';

import { logger } from '@pawmeet/utils';
import { getServerTrpcClient } from '@/lib/server-api';

export async function fetchDog(id: string) {
  const api = await getServerTrpcClient();
  try {
    return await api.admin.getDog.query({ id });
  } catch (error) {
    logger.error('AdminDogs', 'fetchDog failed', error);
    return null;
  }
}
