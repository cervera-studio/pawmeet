import type { GenerateDogBioInput } from '@pawmeet/validation';
import { describe, expect, it, vi } from 'vitest';
import { ClaudeBioGenerationService } from './claude-bio-generation-service.js';

function buildBioInput(overrides: Partial<GenerateDogBioInput> = {}): GenerateDogBioInput {
  return {
    name: 'Luna',
    breed: 'Labrador Retriever',
    size: 'large',
    gender: 'female',
    energyLevel: 'high',
    behaviorWithDogs: 'friendly',
    behaviorWithPeople: 'friendly',
    leashBehavior: 'calm',
    walkPrefTime: ['morning'],
    walkPrefTerrain: ['park'],
    ...overrides,
  } satisfies GenerateDogBioInput;
}

function buildMockClient(text: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  };
}

describe('ClaudeBioGenerationService', () => {
  it('calls Anthropic API with correct model and system prompt', async () => {
    const client = buildMockClient('Ciao, sono Luna!');
    const service = new ClaudeBioGenerationService(client as never);

    await service.generate(buildBioInput());

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: expect.stringContaining('copywriter creativo') as string,
      }),
    );
  });

  it('includes dog details in the user message', async () => {
    const client = buildMockClient('Ciao!');
    const service = new ClaudeBioGenerationService(client as never);

    await service.generate(buildBioInput({ name: 'Rex', breed: 'Pastore Tedesco' }));

    const call = client.messages.create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const userMsg = call.messages[0]?.content ?? '';
    expect(userMsg).toContain('Nome: Rex');
    expect(userMsg).toContain('Razza: Pastore Tedesco');
  });

  it('includes secondary breed when provided', async () => {
    const client = buildMockClient('Ciao!');
    const service = new ClaudeBioGenerationService(client as never);

    await service.generate(buildBioInput({ breed: 'Labrador', breedSecondary: 'Golden' }));

    const call = client.messages.create.mock.calls[0]?.[0] as {
      messages: Array<{ content: string }>;
    };
    const userMsg = call.messages[0]?.content ?? '';
    expect(userMsg).toContain('Labrador / Golden');
  });

  it('returns the generated text', async () => {
    const client = buildMockClient('Ciao, sono Luna e adoro le passeggiate!');
    const service = new ClaudeBioGenerationService(client as never);

    const result = await service.generate(buildBioInput());

    expect(result).toBe('Ciao, sono Luna e adoro le passeggiate!');
  });

  it('returns empty string when response has no text block', async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    };
    const service = new ClaudeBioGenerationService(client as never);

    const result = await service.generate(buildBioInput());

    expect(result).toBe('');
  });

  it('returns empty string when first block is not text type', async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
        }),
      },
    };
    const service = new ClaudeBioGenerationService(client as never);

    const result = await service.generate(buildBioInput());

    expect(result).toBe('');
  });
});
