import { logger } from '@dogwalk/utils';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
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

export default function SettingsModal() {
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

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 py-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900">Impostazioni</Text>

      <View className="gap-1">
        {/* Notification settings section */}
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Notifiche
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700">Nuovi match</Text>
            <Text className="text-xs text-gray-400">Ricevi notifiche per nuovi match</Text>
          </View>
          <Switch
            value={prefs.matches}
            onValueChange={(v) => updatePref('matches', v)}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700">Messaggi</Text>
            <Text className="text-xs text-gray-400">Ricevi notifiche per nuovi messaggi</Text>
          </View>
          <Switch
            value={prefs.messages}
            onValueChange={(v) => updatePref('messages', v)}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700">Promemoria passeggiate</Text>
            <Text className="text-xs text-gray-400">
              Ricevi promemoria per le passeggiate programmate
            </Text>
          </View>
          <Switch
            value={prefs.reminders}
            onValueChange={(v) => updatePref('reminders', v)}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        {/* General settings section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Generali
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700">Condividi posizione</Text>
          <Switch
            value={locationSharing}
            onValueChange={setLocationSharing}
            trackColor={{ true: '#FF6B35' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700">Tema scuro</Text>
          <Switch value={darkMode} onValueChange={setDarkMode} trackColor={{ true: '#FF6B35' }} />
        </View>

        <View className="mt-4 border-t border-gray-100 pt-4">
          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Raggio di ricerca</Text>
            <Text className="text-sm text-gray-400">5 km</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Lingua</Text>
            <Text className="text-sm text-gray-400">Italiano</Text>
          </Pressable>
        </View>

        <View className="mt-4 border-t border-gray-100 pt-4">
          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Termini di servizio</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Privacy Policy</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700">Versione app</Text>
            <Text className="text-sm text-gray-400">0.0.1</Text>
          </Pressable>
        </View>

        {/* Account section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Account
        </Text>

        <Pressable onPress={logout} className="items-center py-4">
          <Text className="text-base font-medium text-red-500">Esci</Text>
        </Pressable>

        <Pressable className="items-center py-4">
          <Text className="text-base font-medium text-red-500">Elimina account</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
