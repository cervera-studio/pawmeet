import type { Badge, Serialized } from '@dogwalk/types';

export interface BadgeRepository {
  listByDog(dogId: string): Promise<{ badges: Serialized<Badge>[] }>;
}
