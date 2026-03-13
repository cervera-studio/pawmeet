/**
 * Analyzes an image for inappropriate content.
 * Returns moderation result with safety categories.
 */
export interface ContentModerationResult {
  safe: boolean;
  categories: Array<{
    name: string;
    confidence: number;
  }>;
}

export interface ContentModerationService {
  analyzeImage(imageUrl: string): Promise<ContentModerationResult>;
}
