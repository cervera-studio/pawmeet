import type { ConsentState } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ConsentModal } from '@/components/ConsentModal';
import { SettingsRow } from '@/components/SettingsRow';
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

const APP_VERSION = Constants.expoConfig?.version ?? '0.0.1';

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 mb-6">{children}</View>;
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
      {title}
    </Text>
  );
}

function Divider() {
  return <View className="border-b border-gray-200 dark:border-[#38383A]" />;
}

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
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const setConsent = useCallback(
    (key: keyof ConsentState, value: boolean) => {
      storeSetConsent(key, value);
      syncSingleConsentToApi(key, value).catch((e) =>
        logger.warn('Settings', `Failed to sync consent ${key}`, e),
      );
    },
    [storeSetConsent],
  );

  // Notification summary for the chevron row
  const enabledCount = Object.values(vm.prefs).filter(Boolean).length;
  const totalCount = Object.values(vm.prefs).length;
  const notifSummary =
    enabledCount === totalCount
      ? t('settings.notifications.summary_all')
      : enabledCount === 0
        ? t('settings.notifications.summary_none')
        : t('settings.notifications.summary_one', { count: enabledCount, total: totalCount });

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-[#1C1C1E]"
      contentContainerClassName="px-6 pt-4 pb-20"
    >
      {/* ── General ── */}
      <SectionHeader title={t('settings.general.title')} />
      <SectionCard>
        <SettingsRow
          title={t('settings.general.darkMode')}
          value={vm.darkMode}
          onToggle={vm.setDarkMode}
        />
        <Divider />
        <SettingsRow
          title={t('settings.general.language')}
          subtitle={LANGUAGES.find((l) => l.code === vm.language)?.label ?? vm.language}
          onPress={() => setShowLanguageModal(true)}
        />
        <Divider />
        <View className="py-3">
          <Text className="mb-2 text-base text-gray-700 dark:text-[#D1D1D6]">
            {t('settings.general.searchRadius')}
          </Text>
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() => vm.updateSearchRadius(Math.max(1, vm.searchRadiusKm - 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-[#48484A]"
            >
              <Text className="text-lg font-bold text-gray-700 dark:text-[#D1D1D6]">−</Text>
            </Pressable>
            <Text className="min-w-[60px] text-center text-xl font-bold text-primary">
              {vm.searchRadiusKm} {t('settings.general.searchRadiusUnit')}
            </Text>
            <Pressable
              onPress={() => vm.updateSearchRadius(Math.min(25, vm.searchRadiusKm + 1))}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-[#48484A]"
            >
              <Text className="text-lg font-bold text-gray-700 dark:text-[#D1D1D6]">+</Text>
            </Pressable>
          </View>
          <Text className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
            {t('settings.general.searchRadiusMin')}
          </Text>
        </View>
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionHeader title={t('settings.notifications.title')} />
      <SectionCard>
        <SettingsRow
          title={t('settings.notifications.title')}
          subtitle={notifSummary}
          onPress={() => router.push('/(modals)/notification-prefs')}
        />
      </SectionCard>

      {/* ── Security ── */}
      <SectionHeader title={t('settings.security.title')} />
      <SectionCard>
        <SettingsRow
          title={t('biometric.settingsTitle')}
          subtitle={t('biometric.settingsDescription')}
          value={biometricEnabled}
          onToggle={setBiometricEnabled}
        />
        {pk.supported ? (
          <>
            <Divider />
            <View className="py-3">
              <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
                {t('passkey.settingsTitle')}
              </Text>
              <Text className="text-xs text-gray-400 dark:text-neutral-500">
                {t('passkey.settingsDescription')}
              </Text>

              {pk.error ? (
                <View className="mt-2 rounded-lg bg-red-50 dark:bg-red-950 px-3 py-2">
                  <Text className="text-xs text-red-600 dark:text-red-400">{pk.error}</Text>
                </View>
              ) : null}

              {pk.passkeys.map((p) => (
                <View
                  key={p.id}
                  className="flex-row items-center justify-between border-b border-gray-200 py-2.5 dark:border-[#38383A]"
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
                    onPress={() =>
                      Alert.alert(t('passkey.deleteTitle'), t('passkey.deleteConfirm'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () => pk.deletePasskey(p.id),
                        },
                      ])
                    }
                    className="rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-sm text-red-500">{t('common.delete')}</Text>
                  </Pressable>
                </View>
              ))}

              <Pressable
                onPress={() => pk.registerPasskey()}
                disabled={pk.loading}
                className="mt-2 items-center rounded-xl bg-gray-200 py-2.5 dark:bg-[#48484A]"
              >
                <Text className="text-sm font-medium text-primary">
                  {pk.loading ? t('common.loading') : t('passkey.addButton')}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </SectionCard>

      {/* ── Privacy & Consent ── */}
      <SectionHeader title={t('settings.privacySection')} />
      <SectionCard>
        <SettingsRow
          title={t('settings.analyticsTitle')}
          subtitle={t('settings.analyticsDescription')}
          value={consents.analytics}
          onToggle={(v) => setConsent('analytics', v)}
        />
        <Divider />
        <SettingsRow
          title={t('settings.abTestingTitle')}
          subtitle={t('settings.abTestingDescription')}
          value={consents.abTesting}
          onToggle={(v) => setConsent('abTesting', v)}
        />
        <Divider />
        <SettingsRow
          title={t('settings.errorTrackingTitle')}
          subtitle={t('settings.errorTrackingDescription')}
          value={consents.errorTracking}
          onToggle={(v) => setConsent('errorTracking', v)}
        />
        <Divider />
        <SettingsRow
          title={t('settings.marketingTitle')}
          subtitle={t('settings.marketingDescription')}
          value={consents.marketing}
          onToggle={(v) => setConsent('marketing', v)}
        />
        <Divider />
        <Pressable onPress={() => setShowConsentModal(true)} className="py-3">
          <Text className="text-sm text-primary">{t('settings.manageConsents')}</Text>
        </Pressable>
      </SectionCard>

      {/* ── About ── */}
      <SectionCard>
        <SettingsRow title={t('settings.legal.appVersion')} subtitle={APP_VERSION} />
        <Divider />
        <SettingsRow
          title={t('settings.general.contactSupport')}
          onPress={() => router.push('/(modals)/support')}
        />
      </SectionCard>

      {/* ── Account ── */}
      <SectionCard>
        <SettingsRow title={t('settings.account.logout')} onPress={vm.logout} variant="danger" />
      </SectionCard>

      {/* ── Modals ── */}
      <ConsentModal visible={showConsentModal} onDismiss={() => setShowConsentModal(false)} />

      {/* Language selector */}
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
                  vm.language === lang.code ? 'bg-primary/15 dark:bg-primary/20' : ''
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
