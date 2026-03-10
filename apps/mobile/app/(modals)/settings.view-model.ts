import { logger } from '@dogwalk/utils';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/trpc';

interface NotificationPrefs {
  matches: boolean;
  messages: boolean;
  reminders: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  matches: true,
  messages: true,
  reminders: true,
};

export function useSettingsViewModel() {
  const { logout } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [locationSharing, setLocationSharing] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Load notification preferences from user profile
  useEffect(() => {
    api.users.getProfile
      .query()
      .then((data) => {
        if (data.user.notificationPrefs) {
          setPrefs(data.user.notificationPrefs);
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

  return {
    prefs,
    locationSharing,
    setLocationSharing,
    darkMode,
    setDarkMode,
    updatePref,
    logout,
  };
}
