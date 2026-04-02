import { describe, expect, it, vi } from 'vitest';
import type { ConsentRepository } from '../ports/consent-repository.js';
import { createGetConsents } from './get-consents.js';

function buildConsentRepo(): ConsentRepository {
  return {
    upsert: vi.fn(),
    findByUser: vi
      .fn()
      .mockResolvedValue([
        { consentType: 'analytics', granted: true, grantedAt: new Date(), source: 'app' },
      ]),
  };
}

describe('createGetConsents', () => {
  it('returns user consents', async () => {
    const deps = { consentRepo: buildConsentRepo() };
    const getConsents = createGetConsents(deps);

    const result = await getConsents('user-1');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.consents).toHaveLength(1);
    expect(result.data.consents[0].consentType).toBe('analytics');
  });
});
