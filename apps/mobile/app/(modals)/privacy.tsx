import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SettingsRow } from '@/components/SettingsRow';
import { Button } from '@/components/ui/Button';
import { usePrivacyViewModel } from './_vm/privacy.view-model';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pawmeet.io';

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 mb-6">{children}</View>;
}

function SectionHeader({ title, danger }: { title: string; danger?: boolean }) {
  return (
    <Text
      className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wide ${danger ? 'text-red-400' : 'text-gray-400 dark:text-neutral-500'}`}
    >
      {title}
    </Text>
  );
}

function Divider() {
  return <View className="border-b border-gray-200 dark:border-[#38383A]" />;
}

export default function PrivacyModal() {
  const { t } = useTranslation();
  const vm = usePrivacyViewModel();

  if (vm.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-[#1C1C1E]">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-[#1C1C1E]"
      contentContainerClassName="px-6 pt-4 pb-20"
    >
      {/* ── Visibility ── */}
      <SectionHeader title={t('privacy.visibilitySection')} />
      <SectionCard>
        <SettingsRow
          title={t('privacy.profileActive')}
          subtitle={t('privacy.profileActiveDescription')}
          value={vm.profileVisible}
          onToggle={vm.toggleProfileVisibility}
        />
        <Divider />
        <SettingsRow
          title={t('privacy.approximateDistance')}
          subtitle={t('privacy.approximateDistanceDescription')}
          value={vm.approximateDistance}
          onToggle={vm.toggleApproximateDistance}
        />
        <Divider />
        <SettingsRow
          title={t('privacy.showLastSeen')}
          subtitle={t('privacy.showLastSeenDescription')}
          value={vm.showLastSeen}
          onToggle={vm.toggleShowLastSeen}
        />
      </SectionCard>

      {/* ── Blocked users ── */}
      <SectionHeader title={t('privacy.blockedSection')} />
      <SectionCard>
        <Pressable
          onPress={vm.navigateToBlocked}
          className="flex-row items-center justify-between py-3"
        >
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {t('privacy.blockedUsers')}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-gray-400 dark:text-neutral-500">{vm.blockedCount}</Text>
            <Text className="text-lg text-gray-400">{'\u203A'}</Text>
          </View>
        </Pressable>
      </SectionCard>

      {/* ── Your data ── */}
      <SectionHeader title={t('privacy.dataSection')} />
      <SectionCard>
        <View className="py-3">
          <Button
            onPress={vm.handleExportData}
            label={vm.isExporting ? t('common.loading') : t('privacy.exportData')}
            variant="outline"
            disabled={vm.isExporting}
          />
          <Text className="mt-2 text-xs text-gray-400 dark:text-neutral-500">
            {t('privacy.exportDataDescription')}
          </Text>
        </View>
      </SectionCard>

      {/* ── Legal ── */}
      <SectionHeader title={t('settings.legal.title', { defaultValue: 'Legal' })} />
      <SectionCard>
        <SettingsRow
          title={t('settings.legal.termsOfService')}
          onPress={() => Linking.openURL(`${WEB_URL}/terms`)}
        />
        <Divider />
        <SettingsRow
          title={t('settings.legal.privacyPolicy')}
          onPress={() => Linking.openURL(`${WEB_URL}/privacy`)}
        />
        <Divider />
        <SettingsRow
          title={t('settings.legal.cookiePolicy')}
          onPress={() => Linking.openURL(`${WEB_URL}/cookie`)}
        />
      </SectionCard>

      {/* ── Danger zone ── */}
      <SectionHeader title={t('privacy.dangerSection')} danger />
      <SectionCard>
        <View className="py-3">
          <Pressable
            onPress={vm.handleDeleteAccount}
            disabled={vm.isDeleting}
            className={`items-center rounded-2xl border-2 border-red-500 py-4 ${vm.isDeleting ? 'opacity-50' : ''}`}
          >
            <Text className="text-base font-semibold text-red-500">
              {vm.isDeleting ? t('settings.account.deletingAccount') : t('privacy.deleteAccount')}
            </Text>
          </Pressable>
          <Text className="mt-2 text-xs text-gray-400 dark:text-neutral-500">
            {t('privacy.deleteWarning')}
          </Text>
        </View>
      </SectionCard>
    </ScrollView>
  );
}
