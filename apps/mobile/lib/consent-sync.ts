import type { ConsentState } from '@dogwalk/types';
import { api } from './trpc';

const CONSENT_KEY_MAP: Record<keyof ConsentState, string> = {
  analytics: 'analytics',
  abTesting: 'ab_testing',
  errorTracking: 'error_tracking',
  marketing: 'marketing',
};

/** Sync all consent values to the server-side `user_consents` table. */
export async function syncConsentsToApi(consents: ConsentState): Promise<void> {
  const payload = Object.entries(consents).map(([key, granted]) => ({
    type: CONSENT_KEY_MAP[key as keyof ConsentState] as
      | 'analytics'
      | 'ab_testing'
      | 'error_tracking'
      | 'marketing',
    granted,
  }));

  await api.consent.update.mutate({ consents: payload });
}

/** Sync a single consent change to the server. */
export async function syncSingleConsentToApi(
  key: keyof ConsentState,
  granted: boolean,
): Promise<void> {
  await api.consent.update.mutate({
    consents: [
      {
        type: CONSENT_KEY_MAP[key] as 'analytics' | 'ab_testing' | 'error_tracking' | 'marketing',
        granted,
      },
    ],
  });
}
