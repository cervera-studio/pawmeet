export interface VectorCandidate {
  dogId: string;
  vectorDistance: number;
}

export interface EmbeddingRepository {
  upsert(dogId: string, embedding: number[], modelVersion: string): Promise<void>;

  findByDogId(dogId: string): Promise<{ embedding: number[]; modelVersion: string } | null>;

  /** Returns top-N nearest dog IDs by cosine distance, excluding given owner and dog IDs. */
  findNearestDogIds(
    embedding: number[],
    limit: number,
    excludeOwnerId: string,
    excludeDogIds?: string[],
  ): Promise<VectorCandidate[]>;

  deleteByDogId(dogId: string): Promise<void>;
}
