/**
 * Detects dog breeds from a photo.
 */
export interface BreedDetectionResult {
  breeds: Array<{
    name: string;
    confidence: number;
  }>;
}

export interface BreedDetectionService {
  detectBreed(imageUrl: string): Promise<BreedDetectionResult>;
}
