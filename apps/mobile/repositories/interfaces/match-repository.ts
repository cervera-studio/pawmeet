import type { DiscoveryFilters } from '@dogwalk/types';

export interface MatchSuggestion {
  [key: string]: unknown;
}

export interface LikeResult {
  isMatch: boolean;
  [key: string]: unknown;
}

export interface MatchRepository {
  discover(dogId: string, filters?: DiscoveryFilters): Promise<{ suggestions: MatchSuggestion[] }>;
  like(dogId: string, targetDogId: string): Promise<LikeResult>;
  pass(dogId: string, targetDogId: string): Promise<void>;
}
