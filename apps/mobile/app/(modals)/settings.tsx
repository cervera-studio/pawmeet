import type { ConsentState } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ConsentModal } from '@/components/ConsentModal';
import { syncSingleConsentToApi } from '@/lib/consent-sync';
import { useConsentStore } from '@/stores/consent';
import { useSettingsViewModel } from './settings.view-model';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pawmeet.io';

export default function SettingsModal() {
  const vm = useSettingsViewModel();
  const consents = useConsentStore((s) => s.consents);
  const storeSetConsent = useConsentStore((s) => s.setConsent);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const setConsent = useCallback(
    (key: keyof ConsentState, value: boolean) => {
      storeSetConsent(key, value);
      syncSingleConsentToApi(key, value).catch((e) =>
        logger.warn('Settings', `Failed to sync consent ${key}`, e),
      );
    },
    [storeSetConsent],
  );

  return (
    <ScrollView className="flex-1 bg-white dark:bg-[#1C1C1E]" contentContainerClassName="px-6 py-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        Impostazioni
      </Text>

      <View className="gap-1">
        {/* Privacy & Consent section */}
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          Privacy e consensi
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Analisi di utilizzo</Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Dati anonimi per migliorare l'app
            </Text>
          </View>
          <Switch
            value={consents.analytics}
            onValueChange={(v) => setConsent('analytics', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Esperimenti A/B</Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Partecipa a test comparativi
            </Text>
          </View>
          <Switch
            value={consents.abTesting}
            onValueChange={(v) => setConsent('abTesting', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Segnalazione errori</Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Report dettagliati (sempre anonimi senza consenso)
            </Text>
          </View>
          <Switch
            value={consents.errorTracking}
            onValueChange={(v) => setConsent('errorTracking', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              Comunicazioni marketing
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Novità, eventi e promozioni via email
            </Text>
          </View>
          <Switch
            value={consents.marketing}
            onValueChange={(v) => setConsent('marketing', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <Pressable onPress={() => setShowConsentModal(true)} className="py-2">
          <Text className="text-sm text-primary underline">Gestisci tutti i consensi</Text>
        </Pressable>

        {/* Notification settings section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          Notifiche
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Nuovi match</Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Ricevi notifiche per nuovi match
            </Text>
          </View>
          <Switch
            value={vm.prefs.matches}
            onValueChange={(v) => vm.updatePref('matches', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Messaggi</Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Ricevi notifiche per nuovi messaggi
            </Text>
          </View>
          <Switch
            value={vm.prefs.messages}
            onValueChange={(v) => vm.updatePref('messages', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              Promemoria passeggiate
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Ricevi promemoria per le passeggiate programmate
            </Text>
          </View>
          <Switch
            value={vm.prefs.reminders}
            onValueChange={(v) => vm.updatePref('reminders', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Feed e storie</Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Ricevi notifiche per like, commenti e nuove storie
            </Text>
          </View>
          <Switch
            value={vm.prefs.feed}
            onValueChange={(v) => vm.updatePref('feed', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              Utenti nelle vicinanze
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Ricevi notifiche quando ci sono utenti vicino a te
            </Text>
          </View>
          <Switch
            value={vm.prefs.nearby}
            onValueChange={(v) => vm.updatePref('nearby', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        {/* Quiet hours section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          Orari silenziosi
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              Attiva orari silenziosi
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              Disattiva le notifiche in determinati orari
            </Text>
          </View>
          <Switch
            value={vm.quietHours.enabled}
            onValueChange={(v) => vm.updateQuietHours({ enabled: v })}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        {vm.quietHours.enabled && (
          <View className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <View>
                <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-1">Dalle</Text>
                <Pressable className="rounded-xl bg-gray-100 dark:bg-[#38383A] px-4 py-2.5">
                  <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                    {vm.quietHours.start}
                  </Text>
                </Pressable>
              </View>
              <View>
                <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-1">Alle</Text>
                <Pressable className="rounded-xl bg-gray-100 dark:bg-[#38383A] px-4 py-2.5">
                  <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                    {vm.quietHours.end}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* General settings section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          Generali
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Condividi posizione</Text>
          <Switch
            value={vm.locationSharing}
            onValueChange={vm.setLocationSharing}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Tema scuro</Text>
          <Switch
            value={vm.darkMode}
            onValueChange={vm.setDarkMode}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="mt-4 border-t border-gray-100 dark:border-[#38383A] pt-4">
          <Pressable className="py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Raggio di ricerca</Text>
            <Text className="text-sm text-gray-400 dark:text-neutral-500">5 km</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Lingua</Text>
            <Text className="text-sm text-gray-400 dark:text-neutral-500">Italiano</Text>
          </Pressable>
        </View>

        <View className="mt-4 border-t border-gray-100 dark:border-[#38383A] pt-4">
          <Pressable className="py-4" onPress={() => Linking.openURL(`${WEB_URL}/terms`)}>
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Termini di servizio</Text>
          </Pressable>

          <Pressable className="py-4" onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}>
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Privacy Policy</Text>
          </Pressable>

          <Pressable className="py-4" onPress={() => Linking.openURL(`${WEB_URL}/cookie`)}>
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Cookie Policy</Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">Versione app</Text>
            <Text className="text-sm text-gray-400 dark:text-neutral-500">0.0.1</Text>
          </Pressable>
        </View>

        {/* Account section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          Account
        </Text>

        <Pressable onPress={vm.logout} className="items-center py-4">
          <Text className="text-base font-medium text-red-500">Esci</Text>
        </Pressable>

        <Pressable
          onPress={vm.deleteAccount}
          disabled={vm.isDeleting}
          className="items-center py-4"
        >
          <Text className="text-base font-medium text-red-500">
            {vm.isDeleting ? 'Eliminazione in corso...' : 'Elimina account'}
          </Text>
        </Pressable>
      </View>

      <ConsentModal visible={showConsentModal} onDismiss={() => setShowConsentModal(false)} />
    </ScrollView>
  );
}
