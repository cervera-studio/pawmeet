import { logger } from '@pawmeet/utils';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';

export function usePrivacyViewModel() {
  const router = useRouter();
  const { logout } = useAuth();

  const [profileVisible, setProfileVisible] = useState(true);
  const [approximateDistance, setApproximateDistance] = useState(false);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [blockedCount, setBlockedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // TODO: load privacy preferences from backend once dedicated endpoint exists
  // Currently these are local-only defaults.
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Load blocked users count
  useEffect(() => {
    api.follows.listBlocked
      .query({ limit: 50, offset: 0 })
      .then((data) => {
        const result = data as { users?: unknown[] };
        setBlockedCount(result.users?.length ?? 0);
      })
      .catch((e) => logger.warn('Privacy', 'Failed to load blocked users', e));
  }, []);

  // TODO: persist to backend once privacy preferences endpoint is available
  const toggleProfileVisibility = useCallback(() => {
    setProfileVisible((prev) => !prev);
  }, []);

  // TODO: persist to backend once privacy preferences endpoint is available
  const toggleApproximateDistance = useCallback(() => {
    setApproximateDistance((prev) => !prev);
  }, []);

  // TODO: persist to backend once privacy preferences endpoint is available
  const toggleShowLastSeen = useCallback(() => {
    setShowLastSeen((prev) => !prev);
  }, []);

  const navigateToBlocked = useCallback(() => {
    router.push('/(modals)/blocked');
  }, [router]);

  const handleExportData = useCallback(() => {
    Alert.alert(i18n.t('privacy.exportConfirmTitle'), i18n.t('privacy.exportConfirmMessage'), [
      { text: i18n.t('common.cancel'), style: 'cancel' },
      {
        text: i18n.t('privacy.exportButton'),
        onPress: () => {
          setIsExporting(true);
          api.users.exportMyData
            .mutate()
            .then(() => {
              Alert.alert(i18n.t('privacy.exportSuccess'), i18n.t('privacy.exportSuccessMessage'));
            })
            .catch((e) => {
              logger.warn('Privacy', 'Failed to export data', e);
              Alert.alert(i18n.t('common.error'), i18n.t('privacy.exportError'));
            })
            .finally(() => setIsExporting(false));
        },
      },
    ]);
  }, []);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      i18n.t('settings.account.deleteConfirmTitle'),
      i18n.t('settings.account.deleteConfirmMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              i18n.t('settings.account.passwordConfirmTitle'),
              i18n.t('settings.account.passwordConfirmMessage'),
              [
                { text: i18n.t('common.cancel'), style: 'cancel' },
                {
                  text: i18n.t('settings.account.confirmDeletion'),
                  style: 'destructive',
                  onPress: (password: string | undefined) => {
                    if (!password) return;
                    setIsDeleting(true);
                    api.users.deleteAccount
                      .mutate({ password })
                      .then(() => {
                        Alert.alert(
                          i18n.t('settings.account.deletedTitle'),
                          i18n.t('settings.account.deletedMessage'),
                          [{ text: i18n.t('common.ok'), onPress: logout }],
                        );
                      })
                      .catch((err) => {
                        setIsDeleting(false);
                        const message =
                          err?.data?.code === 'INVALID_PASSWORD'
                            ? i18n.t('settings.account.invalidPassword')
                            : i18n.t('settings.account.deleteError');
                        Alert.alert(i18n.t('common.error'), message);
                      });
                  },
                },
              ],
              'secure-text',
            );
          },
        },
      ],
    );
  }, [logout]);

  return {
    profileVisible,
    approximateDistance,
    showLastSeen,
    blockedCount,
    isLoading,
    isDeleting,
    isExporting,
    toggleProfileVisibility,
    toggleApproximateDistance,
    toggleShowLastSeen,
    navigateToBlocked,
    handleExportData,
    handleDeleteAccount,
  };
}
