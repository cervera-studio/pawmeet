import type { ConsentState } from '@pawmeet/types';
import { useConsentStore } from '@/stores/consent';
import { api } from './trpc';

const CONSENT_KEY_MAP: Record<keyof ConsentState, string> = {
  analytics: 'analytics',
  abTesting: 'ab_testing',
  errorTracking: 'error_tracking',
  marketing: 'marketing',
  aiTraining: 'ai_training',
};

/** Sync all consent values to the server-side `user_consents` table. */
export async function syncConsentsToApi(consents: ConsentState): Promise<void> {
  const payload = Object.entries(consents).map(([key, granted]) => ({
    type: CONSENT_KEY_MAP[key as keyof ConsentState] as
      | 'analytics'
      | 'ab_testing'
      | 'error_tracking'
      | 'marketing'
      | 'ai_training',
    granted,
  }));

  await api.consent.update.mutate({ consents: payload });
}

const API_KEY_TO_CONSENT: Record<string, keyof ConsentState> = {
  analytics: 'analytics',
  ab_testing: 'abTesting',
  error_tracking: 'errorTracking',
  marketing: 'marketing',
  ai_training: 'aiTraining',
};

/** Load consents from the server and merge into the local store. */
export async function loadConsentsFromApi(): Promise<void> {
  const { consents } = await api.consent.list.query();
  const store = useConsentStore.getState();
  const merged = { ...store.consents };

  for (const c of consents) {
    const key = API_KEY_TO_CONSENT[c.consentType];
    if (key) {
      merged[key] = c.granted;
    }
  }

  store.setAllConsents(merged);
}

/** Sync a single consent change to the server. */
export async function syncSingleConsentToApi(
  key: keyof ConsentState,
  granted: boolean,
): Promise<void> {
  await api.consent.update.mutate({
    consents: [
      {
        type: CONSENT_KEY_MAP[key] as
          | 'analytics'
          | 'ab_testing'
          | 'error_tracking'
          | 'marketing'
          | 'ai_training',
        granted,
      },
    ],
  });
}
