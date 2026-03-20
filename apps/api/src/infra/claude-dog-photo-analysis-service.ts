import type Anthropic from '@anthropic-ai/sdk';
import { logger } from '@pawmeet/utils';
import type {
  DogPhotoAnalysisResult,
  DogPhotoAnalysisService,
} from '../ports/dog-photo-analysis-service.js';

const VALID_SIZES = ['toy', 'small', 'medium', 'large', 'giant'] as const;

export class ClaudeDogPhotoAnalysisService implements DogPhotoAnalysisService {
  constructor(private client: Anthropic) {}

  async analyze(imageBase64: string, mimeType: string): Promise<DogPhotoAnalysisResult | null> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text:
                'Analyze this dog photo. Reply with ONLY a JSON object (no markdown, no explanation):\n' +
                '{\n' +
                '  "breed": "primary breed name in Italian (e.g. Labrador Retriever, Pastore Tedesco)",\n' +
                '  "breedSecondary": "secondary breed if mixed, or null",\n' +
                '  "size": "one of: toy, small, medium, large, giant",\n' +
                '  "ageEstimate": "estimated age range (e.g. 2-4 anni, cucciolo, anziano), or null if unclear",\n' +
                '  "confidence": 0.0-1.0 (how confident you are in the breed identification)\n' +
                '}\n' +
                'If this is not a dog photo, reply with: {"error": "not_a_dog"}',
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const text = firstBlock?.type === 'text' ? firstBlock.text : '';

    try {
      const result = JSON.parse(text) as Record<string, unknown>;

      if (result.error === 'not_a_dog') return null;

      const size = String(result.size ?? 'medium');
      const validSize = VALID_SIZES.includes(size as (typeof VALID_SIZES)[number])
        ? (size as DogPhotoAnalysisResult['size'])
        : 'medium';

      return {
        breed: String(result.breed ?? ''),
        breedSecondary: result.breedSecondary ? String(result.breedSecondary) : undefined,
        size: validSize,
        ageEstimate: result.ageEstimate ? String(result.ageEstimate) : undefined,
        confidence: Math.min(1, Math.max(0, Number(result.confidence ?? 0))),
      };
    } catch {
      logger.warn('ClaudeDogPhotoAnalysis', 'Failed to parse response', { text });
      return null;
    }
  }
}
