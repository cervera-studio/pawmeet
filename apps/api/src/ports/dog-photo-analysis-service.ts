/**
 * Analyzes a dog photo to extract breed, size, and age estimates.
 */
export interface DogPhotoAnalysisResult {
  breed: string;
  breedSecondary?: string;
  size: 'toy' | 'piccola' | 'media' | 'grande' | 'gigante';
  ageEstimate?: string;
  confidence: number;
}

export interface DogPhotoAnalysisService {
  analyze(imageBase64: string, mimeType: string): Promise<DogPhotoAnalysisResult | null>;
}
