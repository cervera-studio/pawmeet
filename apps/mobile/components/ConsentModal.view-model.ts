import type { ConsentState } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useMemo, useState } from 'react';
import { syncConsentsToApi } from '@/lib/consent-sync';
import { useConsentStore } from '@/stores/consent';

const ALL_ON: ConsentState = {
  analytics: true,
  abTesting: true,
  errorTracking: true,
  marketing: true,
  aiTraining: true,
};

const REJECT_STATE: ConsentState = {
  analytics: false,
  abTesting: false,
  errorTracking: false,
  marketing: false,
  aiTraining: false,
};

export function useConsentModalViewModel(onDismiss: () => void) {
  const store = useConsentStore();
  const [local, setLocal] = useState<ConsentState>(() => store.consents);
  const [showDetail, setShowDetail] = useState(false);

  const setConsent = useCallback((key: keyof ConsentState, value: boolean) => {
    setLocal((prev) => {
      const next = { ...prev, [key]: value };
      // A/B testing follows analytics
      if (key === 'analytics') {
        next.abTesting = value;
      }
      return next;
    });
  }, []);

  const save = useCallback(
    (consents: ConsentState) => {
      store.setAllConsents(consents);
      store.markConsentModalSeen();
      syncConsentsToApi(consents).catch((e) =>
        logger.warn('ConsentModal', 'Failed to sync consents to API', e),
      );
      onDismiss();
    },
    [store, onDismiss],
  );

  const acceptAll = useCallback(() => save(ALL_ON), [save]);
  const acceptSelected = useCallback(() => save(local), [save, local]);
  const rejectAll = useCallback(() => save(REJECT_STATE), [save]);

  const enabledCount = useMemo(() => Object.values(local).filter(Boolean).length, [local]);

  return {
    // Simple view state
    showDetail,
    openDetail: useCallback(() => setShowDetail(true), []),
    closeDetail: useCallback(() => setShowDetail(false), []),

    // Toggle values (visible to user: analytics, errorTracking, aiTraining, marketing)
    analytics: local.analytics,
    errorTracking: local.errorTracking,
    aiTraining: local.aiTraining,
    marketing: local.marketing,
    setConsent,
    enabledCount,

    // Actions
    acceptAll,
    acceptSelected,
    rejectAll,
  };
}
