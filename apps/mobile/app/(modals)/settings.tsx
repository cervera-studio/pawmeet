import type { ConsentState } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { ConsentModal } from '@/components/ConsentModal';
import { usePasskeys } from '@/hooks/usePasskeys';
import { usePreventScreenCapture } from '@/hooks/useScreenSecurity';
import { syncSingleConsentToApi } from '@/lib/consent-sync';
import { useConsentStore } from '@/stores/consent';
import { useSettingsStore } from '@/stores/settings';
import { useSettingsViewModel } from './_vm/settings.view-model';

const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'ro', label: 'Română' },
] as const;

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pawmeet.io';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: settings screen contains many sections
export default function SettingsModal() {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const vm = useSettingsViewModel();
  const router = useRouter();
  const pk = usePasskeys();
  const biometricEnabled = useSettingsStore((s) => s.biometricLockEnabled);
  const setBiometricEnabled = useSettingsStore((s) => s.setBiometricLockEnabled);
  const consents = useConsentStore((s) => s.consents);
  const storeSetConsent = useConsentStore((s) => s.setConsent);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState<'start' | 'end' | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const handleTimeChange = useCallback(
    (_event: unknown, date?: Date) => {
      if (!(date && showTimePicker)) {
        setShowTimePicker(null);
        return;
      }
      const hh = String(date.getHours()).padStart(2, '0');
      const mm = String(date.getMinutes()).padStart(2, '0');
      const timeStr = `${hh}:${mm}`;
      vm.updateQuietHours({ [showTimePicker]: timeStr });
      if (Platform.OS === 'android') setShowTimePicker(null);
    },
    [showTimePicker, vm],
  );

  const parseTime = (time: string): Date => {
    const parts = time.split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] ?? 0, parts[1] ?? 0, 0, 0);
    return d;
  };

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
        {t('settings.title')}
      </Text>

      <View className="gap-1">
        {/* Privacy & Consent section */}
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('settings.privacySection')}
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.analyticsTitle')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.analyticsDescription')}
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
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.abTestingTitle')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.abTestingDescription')}
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
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.errorTrackingTitle')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.errorTrackingDescription')}
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
              {t('settings.marketingTitle')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.marketingDescription')}
            </Text>
          </View>
          <Switch
            value={consents.marketing}
            onValueChange={(v) => setConsent('marketing', v)}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <Pressable onPress={() => setShowConsentModal(true)} className="py-2">
          <Text className="text-sm text-primary underline">{t('settings.manageConsents')}</Text>
        </Pressable>

        {/* Notification settings section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('settings.notifications.title')}
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.notifications.newMatches')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.notifications.newMatchesDescription')}
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
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.notifications.messages')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.notifications.messagesDescription')}
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
              {t('settings.notifications.walkReminders')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.notifications.walkRemindersDescription')}
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
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.notifications.feedAndStories')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.notifications.feedAndStoriesDescription')}
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
              {t('settings.notifications.nearbyUsers')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.notifications.nearbyUsersDescription')}
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
          {t('settings.quietHours.title')}
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.quietHours.enable')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.quietHours.description')}
            </Text>
          </View>
          <Switch
            value={vm.quietHours.enabled}
            onValueChange={(v) => vm.updateQuietHours({ enabled: v })}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        {vm.quietHours.enabled && (
          <>
            <View className="flex-row items-center justify-between py-4">
              <View className="flex-row items-center gap-3">
                <View>
                  <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-1">
                    {t('settings.quietHours.from')}
                  </Text>
                  <Pressable
                    onPress={() => setShowTimePicker('start')}
                    className="rounded-xl bg-gray-100 dark:bg-[#38383A] px-4 py-2.5"
                  >
                    <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                      {vm.quietHours.start}
                    </Text>
                  </Pressable>
                </View>
                <View>
                  <Text className="text-xs text-gray-400 dark:text-neutral-500 mb-1">
                    {t('settings.quietHours.to')}
                  </Text>
                  <Pressable
                    onPress={() => setShowTimePicker('end')}
                    className="rounded-xl bg-gray-100 dark:bg-[#38383A] px-4 py-2.5"
                  >
                    <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                      {vm.quietHours.end}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
            {showTimePicker && (
              <View className="py-2">
                <DateTimePicker
                  value={parseTime(
                    showTimePicker === 'start' ? vm.quietHours.start : vm.quietHours.end,
                  )}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                />
                {Platform.OS === 'ios' && (
                  <Pressable onPress={() => setShowTimePicker(null)} className="items-center py-2">
                    <Text className="text-sm font-medium text-primary">
                      {t('settings.quietHours.confirm')}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </>
        )}

        {/* General settings section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('settings.general.title')}
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {t('settings.general.shareLocation')}
          </Text>
          <Switch
            value={vm.locationSharing}
            onValueChange={vm.setLocationSharing}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {t('settings.general.darkMode')}
          </Text>
          <Switch
            value={vm.darkMode}
            onValueChange={vm.setDarkMode}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('biometric.settingsTitle')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('biometric.settingsDescription')}
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        {pk.supported ? (
          <View className="mt-2">
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-1 pr-4">
                <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
                  {t('passkey.settingsTitle')}
                </Text>
                <Text className="text-xs text-gray-400 dark:text-neutral-500">
                  {t('passkey.settingsDescription')}
                </Text>
              </View>
            </View>

            {pk.error ? (
              <View className="mb-2 rounded-lg bg-red-50 px-3 py-2">
                <Text className="text-xs text-red-600">{pk.error}</Text>
              </View>
            ) : null}

            {pk.passkeys.map((p) => (
              <View
                key={p.id}
                className="flex-row items-center justify-between border-b border-gray-100 py-3 dark:border-[#38383A]"
              >
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                    {p.friendlyName ?? t('passkey.defaultName')}
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-neutral-500">
                    {p.backedUp ? t('passkey.synced') : t('passkey.thisDevice')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => pk.deletePasskey(p.id)}
                  className="rounded-lg px-3 py-1.5"
                >
                  <Text className="text-sm text-red-500">{t('common.delete')}</Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              onPress={() => pk.registerPasskey()}
              disabled={pk.loading}
              className="mt-2 items-center rounded-xl bg-gray-100 py-3 dark:bg-[#38383A]"
            >
              <Text className="text-sm font-medium text-primary">
                {pk.loading ? t('common.loading') : t('passkey.addButton')}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View className="mt-4 border-t border-gray-100 dark:border-[#38383A] pt-4">
          <View className="py-4">
            <Text className="mb-2 text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.general.searchRadius')}
            </Text>
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => vm.updateSearchRadius(Math.max(1, vm.searchRadiusKm - 1))}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#38383A]"
              >
                <Text className="text-lg font-bold text-gray-700 dark:text-[#D1D1D6]">−</Text>
              </Pressable>
              <Text className="min-w-[60px] text-center text-xl font-bold text-primary">
                {vm.searchRadiusKm} {t('settings.general.searchRadiusUnit')}
              </Text>
              <Pressable
                onPress={() => vm.updateSearchRadius(Math.min(25, vm.searchRadiusKm + 1))}
                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-[#38383A]"
              >
                <Text className="text-lg font-bold text-gray-700 dark:text-[#D1D1D6]">+</Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
              {t('settings.general.searchRadiusMin')}
            </Text>
          </View>

          <Pressable onPress={() => setShowLanguageModal(true)} className="py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.general.language')}
            </Text>
            <Text className="text-sm text-gray-400 dark:text-neutral-500">
              {LANGUAGES.find((l) => l.code === vm.language)?.label ?? vm.language}
            </Text>
          </Pressable>
        </View>

        <View className="mt-4 border-t border-gray-100 dark:border-[#38383A] pt-4">
          <Pressable className="py-4" onPress={() => Linking.openURL(`${WEB_URL}/terms`)}>
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.legal.termsOfService')}
            </Text>
          </Pressable>

          <Pressable className="py-4" onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}>
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.legal.privacyPolicy')}
            </Text>
          </Pressable>

          <Pressable className="py-4" onPress={() => Linking.openURL(`${WEB_URL}/cookie`)}>
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.legal.cookiePolicy')}
            </Text>
          </Pressable>

          <Pressable className="py-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('settings.legal.appVersion')}
            </Text>
            <Text className="text-sm text-gray-400 dark:text-neutral-500">0.0.1</Text>
          </Pressable>

          <Pressable className="py-4" onPress={() => router.push('/(modals)/support')}>
            <Text className="text-base text-primary font-medium">
              {t('settings.general.contactSupport')}
            </Text>
          </Pressable>
        </View>

        {/* Account section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('settings.account.title')}
        </Text>

        <Pressable onPress={vm.logout} className="items-center py-4">
          <Text className="text-base font-medium text-red-500">{t('settings.account.logout')}</Text>
        </Pressable>

        <Pressable
          onPress={vm.deleteAccount}
          disabled={vm.isDeleting}
          className="items-center py-4"
        >
          <Text className="text-base font-medium text-red-500">
            {vm.isDeleting
              ? t('settings.account.deletingAccount')
              : t('settings.account.deleteAccount')}
          </Text>
        </Pressable>
      </View>

      <ConsentModal visible={showConsentModal} onDismiss={() => setShowConsentModal(false)} />

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          onPress={() => setShowLanguageModal(false)}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="rounded-t-3xl bg-white dark:bg-[#2C2C2E] px-6 pb-10 pt-6">
            <Text className="mb-4 text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
              {t('settings.general.selectLanguage')}
            </Text>
            {LANGUAGES.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => {
                  vm.changeLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
                className={`rounded-xl px-4 py-4 ${
                  vm.language === lang.code ? 'bg-primary/10' : ''
                }`}
              >
                <Text
                  className={`text-base ${
                    vm.language === lang.code
                      ? 'font-semibold text-primary'
                      : 'text-gray-700 dark:text-[#D1D1D6]'
                  }`}
                >
                  {lang.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
