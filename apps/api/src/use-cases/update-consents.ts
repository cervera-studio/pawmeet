import type { Result } from '@dogwalk/types';
import type { UpdateConsentInput } from '@dogwalk/validation';
import type { ConsentRepository } from '../infra/drizzle-consent-repository.js';

interface Deps {
  consentRepo: ConsentRepository;
}

export function createUpdateConsents(deps: Deps) {
  return async (
    userId: string,
    input: UpdateConsentInput,
    ipAddress: string | null,
    userAgent: string | null,
    source: string,
  ): Promise<Result<{ updated: number }>> => {
    for (const consent of input.consents) {
      await deps.consentRepo.upsert(
        userId,
        consent.type,
        consent.granted,
        source,
        ipAddress,
        userAgent,
      );
    }
    return { success: true, data: { updated: input.consents.length } };
  };
}
