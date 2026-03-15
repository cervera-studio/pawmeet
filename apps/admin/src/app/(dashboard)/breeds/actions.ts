'use server';

import { getServerTrpcClient } from '@/lib/server-api';

type SizeCategory = 'toy' | 'piccola' | 'media' | 'grande' | 'gigante';

export async function fetchBreeds(params: {
  page: number;
  pageSize: number;
  search?: string;
  group?: string;
}) {
  const api = await getServerTrpcClient();
  return api.admin.listBreeds.query(params);
}

interface BreedScores {
  energy?: number | null;
  playfulness?: number | null;
  trainability?: number | null;
  barking?: number | null;
  goodWithOtherDogs?: number | null;
  goodWithChildren?: number | null;
  goodWithStrangers?: number | null;
  protectiveness?: number | null;
  shedding?: number | null;
  grooming?: number | null;
}

export async function createBreed(
  data: {
    name: string;
    nameIt: string;
    group: string;
    sizeCategory: SizeCategory;
    avgWeightKg: number;
  } & BreedScores,
) {
  const api = await getServerTrpcClient();
  return api.admin.createBreed.mutate(data);
}

export async function updateBreed(
  data: {
    id: number;
    name?: string;
    nameIt?: string;
    group?: string;
    sizeCategory?: SizeCategory;
    avgWeightKg?: number;
  } & BreedScores,
) {
  const api = await getServerTrpcClient();
  return api.admin.updateBreed.mutate(data);
}

export async function deleteBreed(data: { id: number }) {
  const api = await getServerTrpcClient();
  return api.admin.deleteBreed.mutate(data);
}
