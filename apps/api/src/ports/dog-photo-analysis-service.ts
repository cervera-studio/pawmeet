import type { DogSize } from '@pawmeet/types';

/**
 * Analyzes a dog photo to extract breed, size, and age estimates.
 */
export interface DogPhotoAnalysisResult {
  breed: string;
  breedSecondary?: string;
  size: DogSize;
  ageEstimate?: string;
  confidence: number;
}

export interface DogPhotoAnalysisService {
  analyze(imageBase64: string, mimeType: string): Promise<DogPhotoAnalysisResult | null>;
}
