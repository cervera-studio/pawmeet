import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentModerationResult,
  ContentModerationService,
} from '../ports/content-moderation-service.js';

export class ClaudeContentModerationService implements ContentModerationService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  }

  async analyzeImage(imageUrl: string): Promise<ContentModerationResult> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: 'Analyze this image for content moderation. This should be a dog photo for a social app. Reply with ONLY a JSON object (no markdown) with this format: {"safe": true/false, "categories": [{"name": "category_name", "confidence": 0.0-1.0}]}. Categories to check: "violence", "sexual", "hate", "self_harm", "not_a_dog". Mark safe=false if ANY category has confidence > 0.7 or if the image is not primarily of a dog.',
            },
          ],
        },
      ],
    });

    const firstBlock = response.content[0];
    const text = firstBlock?.type === 'text' ? firstBlock.text : '';

    try {
      const result = JSON.parse(text) as {
        safe: boolean;
        categories: Array<{ name: string; confidence: number }>;
      };
      return {
        safe: result.safe,
        categories: result.categories ?? [],
      };
    } catch {
      // If parsing fails, default to safe (don't block uploads on API issues)
      return { safe: true, categories: [] };
    }
  }
}
