import { logger } from '@pawmeet/utils';
import type {
  ToxicityDetectionService,
  ToxicityResult,
} from '../ports/toxicity-detection-service.js';

const PERSPECTIVE_API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';
const TOXICITY_THRESHOLD = 0.7;

export class PerspectiveToxicityService implements ToxicityDetectionService {
  private apiKey: string;

  constructor() {
    const key = process.env.PERSPECTIVE_API_KEY;
    if (!key) {
      throw new Error('PERSPECTIVE_API_KEY environment variable is required');
    }
    this.apiKey = key;
  }

  async analyzeText(text: string, language = 'it'): Promise<ToxicityResult> {
    const response = await fetch(PERSPECTIVE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
      },
      body: JSON.stringify({
        comment: { text },
        languages: [language],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          PROFANITY: {},
          THREAT: {},
        },
      }),
    });

    if (!response.ok) {
      logger.error('PerspectiveToxicity', `API error: ${response.status}`);
      // Don't block messages on API errors
      return {
        toxic: false,
        scores: { toxicity: 0, severeToxicity: 0, insult: 0, profanity: 0, threat: 0 },
      };
    }

    const data = (await response.json()) as {
      attributeScores: Record<string, { summaryScore: { value: number } }>;
    };

    const scores = {
      toxicity: data.attributeScores.TOXICITY?.summaryScore.value ?? 0,
      severeToxicity: data.attributeScores.SEVERE_TOXICITY?.summaryScore.value ?? 0,
      insult: data.attributeScores.INSULT?.summaryScore.value ?? 0,
      profanity: data.attributeScores.PROFANITY?.summaryScore.value ?? 0,
      threat: data.attributeScores.THREAT?.summaryScore.value ?? 0,
    };

    return {
      toxic: scores.toxicity >= TOXICITY_THRESHOLD || scores.severeToxicity >= TOXICITY_THRESHOLD,
      scores,
    };
  }
}
