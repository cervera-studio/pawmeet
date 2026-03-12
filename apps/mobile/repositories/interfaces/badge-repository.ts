import type { Badge, Serialized } from '@pawmeet/types';

export interface BadgeRepository {
  listByDog(dogId: string): Promise<{ badges: Serialized<Badge>[] }>;
}
