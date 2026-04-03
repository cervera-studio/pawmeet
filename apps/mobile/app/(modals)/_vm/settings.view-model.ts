import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import i18n from '@/lib/i18n';
import { api } from '@/lib/trpc';
import { useThemeStore } from '@/stores/theme';

interface NotificationPrefs {
  matches: boolean;
  messages: boolean;
  reminders: boolean;
  feed: boolean;
  nearby: boolean;
}

interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm format
  end: string; // HH:mm format
}

const DEFAULT_PREFS: NotificationPrefs = {
  matches: true,
  messages: true,
  reminders: true,
  feed: true,
  nearby: true,
};

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: '22:00',
  end: '07:00',
};

export function useSettingsViewModel() {
  const { logout } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const darkMode = themePreference === 'dark';
  const setDarkMode = useCallback(
    (enabled: boolean) => setThemePreference(enabled ? 'dark' : 'light'),
    [setThemePreference],
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);
  const [searchRadiusKm, setSearchRadiusKmLocal] = useState(5);
  const [language, setLanguageLocal] = useState(i18n.language || 'it');

  // Load notification preferences from user profile
  useEffect(() => {
    api.users.getProfile
      .query()
      .then((data) => {
        if (data.notificationPrefs) {
          setPrefs(data.notificationPrefs);
          // Quiet hours are stored as separate fields in notification prefs
          const np = data.notificationPrefs as {
            quietHoursStart?: string | null;
            quietHoursEnd?: string | null;
          };
          if (np.quietHoursStart && np.quietHoursEnd) {
            setQuietHours({
              enabled: true,
              start: np.quietHoursStart,
              end: np.quietHoursEnd,
            });
          }
        }
        if (data.searchRadiusKm) {
          setSearchRadiusKmLocal(data.searchRadiusKm);
        }
      })
      .catch((e) => logger.warn('Settings', 'Failed to load notification prefs', e));
  }, []);

  // Persist a single notification pref toggle to the backend
  const updatePref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));

    api.users.updateNotificationPrefs.mutate({ [key]: value }).catch((e) => {
      logger.warn('Settings', `Failed to update ${key} pref`, e);
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    });
  }, []);

  const updateQuietHours = useCallback((update: Partial<QuietHours>) => {
    let snapshot: QuietHours | undefined;
    setQuietHours((prev) => {
      snapshot = prev;
      return { ...prev, ...update };
    });

    // We need the merged value for the API call
    const merged = { ...(snapshot ?? DEFAULT_QUIET_HOURS), ...update };
    api.users.updateNotificationPrefs
      .mutate({
        quietHoursStart: merged.enabled ? merged.start : null,
        quietHoursEnd: merged.enabled ? merged.end : null,
      })
      .catch((e) => {
        logger.warn('Settings', 'Failed to update quiet hours', e);
        if (snapshot) setQuietHours(snapshot);
      });
  }, []);

  const updateSearchRadius = useCallback((km: number) => {
    let prev: number | undefined;
    setSearchRadiusKmLocal((current) => {
      prev = current;
      return km;
    });
    api.users.updatePreferences.mutate({ searchRadiusKm: km }).catch((e) => {
      logger.warn('Settings', 'Failed to update search radius', e);
      if (prev !== undefined) setSearchRadiusKmLocal(prev);
    });
  }, []);

  const changeLanguage = useCallback((lang: string) => {
    setLanguageLocal(lang);
    i18n.changeLanguage(lang);
  }, []);

  const deleteAccount = useCallback(() => {
    Alert.alert(
      i18n.t('settings.account.deleteConfirmTitle'),
      i18n.t('settings.account.deleteConfirmMessage'),
      [
        { text: i18n.t('common.cancel'), style: 'cancel' },
        {
          text: i18n.t('common.delete'),
          style: 'destructive',
          onPress: () => {
            setDeletePassword('');
            setShowDeleteConfirm(true);
          },
        },
      ],
    );
  }, []);

  const confirmDeleteAccount = useCallback(
    (password: string) => {
      if (!password) return;
      setIsDeleting(true);
      setShowDeleteConfirm(false);
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
    [logout],
  );

  return {
    prefs,
    darkMode,
    setDarkMode,
    updatePref,
    quietHours,
    updateQuietHours,
    logout,
    deleteAccount,
    confirmDeleteAccount,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deletePassword,
    setDeletePassword,
    isDeleting,
    searchRadiusKm,
    updateSearchRadius,
    language,
    changeLanguage,
  };
}
