import { logger } from '@pawmeet/utils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
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
  const [locationSharing, setLocationSharing] = useState(true);
  const themePreference = useThemeStore((s) => s.preference);
  const setThemePreference = useThemeStore((s) => s.setPreference);
  const darkMode = themePreference === 'dark';
  const setDarkMode = useCallback(
    (enabled: boolean) => setThemePreference(enabled ? 'dark' : 'light'),
    [setThemePreference],
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [quietHours, setQuietHours] = useState<QuietHours>(DEFAULT_QUIET_HOURS);

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
      })
      .catch((e) => logger.warn('Settings', 'Failed to load notification prefs', e));
  }, []);

  // Persist a single notification pref toggle to the backend
  const updatePref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);

      api.users.updateNotificationPrefs.mutate({ [key]: value }).catch((e) => {
        logger.warn('Settings', `Failed to update ${key} pref`, e);
        // Revert on failure
        setPrefs(prefs);
      });
    },
    [prefs],
  );

  const updateQuietHours = useCallback(
    (update: Partial<QuietHours>) => {
      const updated = { ...quietHours, ...update };
      setQuietHours(updated);

      api.users.updateNotificationPrefs
        .mutate({
          quietHoursStart: updated.enabled ? updated.start : null,
          quietHoursEnd: updated.enabled ? updated.end : null,
        })
        .catch((e) => {
          logger.warn('Settings', 'Failed to update quiet hours', e);
          setQuietHours(quietHours);
        });
    },
    [quietHours],
  );

  const deleteAccount = useCallback(() => {
    Alert.alert(
      'Elimina account',
      'Sei sicuro? Il tuo account verrà disattivato immediatamente e i dati eliminati entro 30 giorni. Questa azione non può essere annullata.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            Alert.prompt(
              'Conferma con password',
              "Inserisci la tua password per confermare la cancellazione dell'account.",
              [
                { text: 'Annulla', style: 'cancel' },
                {
                  text: 'Conferma eliminazione',
                  style: 'destructive',
                  onPress: (password: string | undefined) => {
                    if (!password) return;
                    setIsDeleting(true);
                    api.users.deleteAccount
                      .mutate({ password })
                      .then(() => {
                        Alert.alert(
                          'Account eliminato',
                          'Il tuo account è stato disattivato. Riceverai una email di conferma.',
                          [{ text: 'OK', onPress: logout }],
                        );
                      })
                      .catch((err) => {
                        setIsDeleting(false);
                        const message =
                          err?.data?.code === 'INVALID_PASSWORD'
                            ? 'Password non valida. Riprova.'
                            : 'Errore durante la cancellazione. Riprova più tardi.';
                        Alert.alert('Errore', message);
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
    prefs,
    locationSharing,
    setLocationSharing,
    darkMode,
    setDarkMode,
    updatePref,
    quietHours,
    updateQuietHours,
    logout,
    deleteAccount,
    isDeleting,
  };
}
