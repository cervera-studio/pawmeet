import type { ConsentState } from '@pawmeet/types';
import { DEFAULT_CONSENT_STATE } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { syncConsentsToApi } from '@/lib/consent-sync';
import { useConsentStore } from '@/stores/consent';

export function useConsentModalViewModel(onDismiss: () => void) {
  const store = useConsentStore();
  const [local, setLocal] = useState<ConsentState>(DEFAULT_CONSENT_STATE);

  const setConsent = useCallback((key: keyof ConsentState, value: boolean) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const acceptSelected = useCallback(() => {
    store.setAllConsents(local);
    store.markConsentModalSeen();
    syncConsentsToApi(local).catch((e) =>
      logger.warn('ConsentModal', 'Failed to sync consents to API', e),
    );
    onDismiss();
  }, [local, store, onDismiss]);

  const rejectAll = useCallback(() => {
    store.setAllConsents(DEFAULT_CONSENT_STATE);
    store.markConsentModalSeen();
    syncConsentsToApi(DEFAULT_CONSENT_STATE).catch((e) =>
      logger.warn('ConsentModal', 'Failed to sync consents to API', e),
    );
    onDismiss();
  }, [store, onDismiss]);

  return {
    analytics: local.analytics,
    abTesting: local.abTesting,
    errorTracking: local.errorTracking,
    marketing: local.marketing,
    aiTraining: local.aiTraining,
    setConsent,
    acceptSelected,
    rejectAll,
  };
}
