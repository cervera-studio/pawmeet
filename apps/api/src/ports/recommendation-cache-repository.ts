/**
 * Port for cached ML recommendations.
 * Abstracts the backing store (Redis sorted sets) from the use case layer.
 */
export interface RecommendationCacheRepository {
  /** Get top-N precomputed recommendation dog IDs for a user, ordered by score descending. */
  getTopRecommendations(userId: string, limit: number): Promise<string[]>;
}
