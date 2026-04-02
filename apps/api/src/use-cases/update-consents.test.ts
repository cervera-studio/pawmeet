import { describe, expect, it, vi } from 'vitest';
import type { ConsentRepository } from '../ports/consent-repository.js';
import { createUpdateConsents } from './update-consents.js';

function buildConsentRepo(): ConsentRepository {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    findByUser: vi.fn(),
  };
}

describe('createUpdateConsents', () => {
  it('upserts each consent and returns count', async () => {
    const consentRepo = buildConsentRepo();
    const updateConsents = createUpdateConsents({ consentRepo });

    const result = await updateConsents(
      'user-1',
      {
        consents: [
          { type: 'analytics', granted: true },
          { type: 'marketing', granted: false },
        ],
      },
      '1.2.3.4',
      'Mozilla/5.0',
      'app',
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.updated).toBe(2);
    expect(consentRepo.upsert).toHaveBeenCalledTimes(2);
    expect(consentRepo.upsert).toHaveBeenCalledWith(
      'user-1',
      'analytics',
      true,
      'app',
      '1.2.3.4',
      'Mozilla/5.0',
    );
  });
});
