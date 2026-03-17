import type Anthropic from '@anthropic-ai/sdk';
import type { GenerateDogBioInput } from '@pawmeet/validation';
import type { BioGenerationService } from '../ports/bio-generation-service.js';

export class ClaudeBioGenerationService implements BioGenerationService {
  constructor(private client: Anthropic) {}

  async generate(input: GenerateDogBioInput): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:
        "Sei un copywriter creativo per un'app social dedicata ai proprietari di cani. " +
        'Scrivi una bio breve in italiano (2-3 frasi, massimo 300 caratteri) per il profilo di un cane. ' +
        'Tono: amichevole, simpatico, in prima persona dal punto di vista del cane. ' +
        'Non inventare dettagli oltre a quelli forniti. Non usare emoji.',
      messages: [
        {
          role: 'user',
          content:
            `Nome: ${input.name}\n` +
            `Razza: ${input.breed}${input.breedSecondary ? ` / ${input.breedSecondary}` : ''}\n` +
            `Taglia: ${input.size}\n` +
            `Sesso: ${input.gender}\n` +
            `Energia: ${input.energyLevel}\n` +
            `Con altri cani: ${input.behaviorWithDogs}\n` +
            `Con le persone: ${input.behaviorWithPeople}\n` +
            `Al guinzaglio: ${input.leashBehavior}\n` +
            `Orari passeggiata preferiti: ${input.walkPrefTime.join(', ')}\n` +
            `Terreni preferiti: ${input.walkPrefTerrain.join(', ')}`,
        },
      ],
    });

    const firstBlock = response.content[0];
    return firstBlock?.type === 'text' ? firstBlock.text : '';
  }
}
