import type { Badge, BadgeType } from '@pawmeet/types';

export interface BadgeRepository {
  findByDog(dogId: string): Promise<Badge[]>;
  award(dogId: string, type: BadgeType): Promise<Badge>;
  hasBadge(dogId: string, type: BadgeType): Promise<boolean>;
}
