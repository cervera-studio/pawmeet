import type { AnalyticsService, ConsentState } from '@pawmeet/types';
import { DEFAULT_CONSENT_STATE } from '@pawmeet/types';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

interface ConsentStoreState {
  consents: ConsentState;
  hasSeenConsentModal: boolean;
  setConsent: (key: keyof ConsentState, value: boolean) => void;
  setAllConsents: (consents: ConsentState) => void;
  markConsentModalSeen: () => void;
  resetConsents: () => void;
}

export const useConsentStore = create<ConsentStoreState>()(
  persist(
    (set) => ({
      consents: DEFAULT_CONSENT_STATE,
      hasSeenConsentModal: false,

      setConsent: (key, value) =>
        set((state) => ({
          consents: { ...state.consents, [key]: value },
        })),

      setAllConsents: (consents) => set({ consents }),

      markConsentModalSeen: () => set({ hasSeenConsentModal: true }),

      resetConsents: () =>
        set({
          consents: DEFAULT_CONSENT_STATE,
          hasSeenConsentModal: false,
        }),
    }),
    {
      name: 'pawmeet-consent',
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);

/**
 * Subscribe to analytics consent changes and toggle the analytics service.
 * Call once after DI container is initialized.
 */
export function initConsentSubscription(service: AnalyticsService): void {
  let prevAnalytics = useConsentStore.getState().consents.analytics;
  let prevConsents = { ...useConsentStore.getState().consents };

  useConsentStore.subscribe((state) => {
    const current = state.consents.analytics;
    if (current !== prevAnalytics) {
      prevAnalytics = current;
      if (current) {
        service.optIn();
      } else {
        service.optOut();
      }
    }

    // Track consent changes (only if analytics is enabled)
    const c = state.consents;
    const changed =
      c.analytics !== prevConsents.analytics ||
      c.abTesting !== prevConsents.abTesting ||
      c.errorTracking !== prevConsents.errorTracking ||
      c.marketing !== prevConsents.marketing ||
      c.aiTraining !== prevConsents.aiTraining;

    if (changed) {
      prevConsents = { ...c };
      service.track('privacy_consent_updated', {
        analytics: c.analytics,
        abTesting: c.abTesting,
        errorTracking: c.errorTracking,
        marketing: c.marketing,
        aiTraining: c.aiTraining,
      });
    }
  });
}
