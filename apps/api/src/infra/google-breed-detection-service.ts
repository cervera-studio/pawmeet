import { logger } from '@pawmeet/utils';
import type {
  BreedDetectionResult,
  BreedDetectionService,
} from '../ports/breed-detection-service.js';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

/** Allowed URL patterns for breed detection images (only our R2 bucket). */
const ALLOWED_IMAGE_HOSTS = [
  /^https:\/\/[a-z0-9-]+\.r2\.cloudflarestorage\.com\//,
  /^https:\/\/[a-z0-9-]+\.r2\.dev\//,
  /^https:\/\/cdn\.pawmeet\.io\//,
];

/** Reject URLs that could reach internal services (SSRF prevention). */
function validateImageUrl(imageUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error('Invalid image URL');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Image URL must use HTTPS');
  }

  const isAllowed = ALLOWED_IMAGE_HOSTS.some((pattern) => pattern.test(imageUrl));
  if (!isAllowed) {
    throw new Error('Image URL not from allowed storage origin');
  }
}

export class GoogleBreedDetectionService implements BreedDetectionService {
  private apiKey: string;

  constructor() {
    const key = process.env.GOOGLE_VISION_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_VISION_API_KEY environment variable is required');
    }
    this.apiKey = key;
  }

  async detectBreed(imageUrl: string): Promise<BreedDetectionResult> {
    validateImageUrl(imageUrl);

    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
      },
      body: JSON.stringify({
        requests: [
          {
            image: { source: { imageUri: imageUrl } },
            features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.error('GoogleBreedDetection', `API error: ${response.status}`);
      return { breeds: [] };
    }

    const data = (await response.json()) as {
      responses: Array<{
        labelAnnotations?: Array<{ description: string; score: number }>;
      }>;
    };

    const labels = data.responses[0]?.labelAnnotations ?? [];

    // Filter for dog breed labels (Google Vision returns breed names as labels)
    // Common patterns: "Golden Retriever", "Labrador Retriever", "German Shepherd Dog"
    const dogRelatedLabels = labels.filter(
      (l) =>
        l.score > 0.5 &&
        ![
          'Dog',
          'Canidae',
          'Mammal',
          'Vertebrate',
          'Carnivore',
          'Dog breed',
          'Companion dog',
          'Snout',
        ].includes(l.description),
    );

    return {
      breeds: dogRelatedLabels.map((l) => ({
        name: l.description,
        confidence: l.score,
      })),
    };
  }
}
