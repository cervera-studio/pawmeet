import type { ConsentState } from '@dogwalk/types';
import { DEFAULT_CONSENT_STATE } from '@dogwalk/types';
import { useCallback, useState } from 'react';
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
    onDismiss();
  }, [local, store, onDismiss]);

  const rejectAll = useCallback(() => {
    store.setAllConsents(DEFAULT_CONSENT_STATE);
    store.markConsentModalSeen();
    onDismiss();
  }, [store, onDismiss]);

  return {
    analytics: local.analytics,
    abTesting: local.abTesting,
    errorTracking: local.errorTracking,
    marketing: local.marketing,
    setConsent,
    acceptSelected,
    rejectAll,
  };
}
