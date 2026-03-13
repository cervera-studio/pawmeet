/**
 * Detects toxic/harmful content in text messages.
 */
export interface ToxicityResult {
  toxic: boolean;
  scores: {
    toxicity: number;
    severeToxicity: number;
    insult: number;
    profanity: number;
    threat: number;
  };
}

export interface ToxicityDetectionService {
  analyzeText(text: string, language?: string): Promise<ToxicityResult>;
}
