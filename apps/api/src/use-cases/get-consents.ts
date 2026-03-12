import type { Result } from '@pawmeet/types';
import type { ConsentRecord, ConsentRepository } from '../infra/drizzle-consent-repository.js';

interface Deps {
  consentRepo: ConsentRepository;
}

export function createGetConsents(deps: Deps) {
  return async (userId: string): Promise<Result<{ consents: ConsentRecord[] }>> => {
    const consents = await deps.consentRepo.findByUser(userId);
    return { success: true, data: { consents } };
  };
}
