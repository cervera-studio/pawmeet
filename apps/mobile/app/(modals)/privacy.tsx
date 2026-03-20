import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { usePrivacyViewModel } from './privacy.view-model';

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
    <ScrollView className="flex-1 bg-white dark:bg-[#1C1C1E]" contentContainerClassName="px-6 py-4">
      <Text className="mb-6 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('privacy.title')}
      </Text>

      <View className="gap-1">
        {/* Visibility section */}
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('privacy.visibilitySection')}
        </Text>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('privacy.profileActive')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('privacy.profileActiveDescription')}
            </Text>
          </View>
          <Switch
            value={vm.profileVisible}
            onValueChange={vm.toggleProfileVisibility}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('privacy.approximateDistance')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('privacy.approximateDistanceDescription')}
            </Text>
          </View>
          <Switch
            value={vm.approximateDistance}
            onValueChange={vm.toggleApproximateDistance}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-4">
          <View className="flex-1 pr-4">
            <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
              {t('privacy.showLastSeen')}
            </Text>
            <Text className="text-xs text-gray-400 dark:text-neutral-500">
              {t('privacy.showLastSeenDescription')}
            </Text>
          </View>
          <Switch
            value={vm.showLastSeen}
            onValueChange={vm.toggleShowLastSeen}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        {/* Blocked users section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('privacy.blockedSection')}
        </Text>

        <Pressable
          onPress={vm.navigateToBlocked}
          className="flex-row items-center justify-between rounded-xl py-4"
        >
          <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">
            {t('privacy.blockedUsers')}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-gray-400 dark:text-neutral-500">{vm.blockedCount}</Text>
            <Text className="text-gray-400 dark:text-neutral-500">{'\u203A'}</Text>
          </View>
        </Pressable>

        {/* Your data section */}
        <Text className="mb-2 mt-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('privacy.dataSection')}
        </Text>

        <View className="py-4">
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

        {/* Danger zone section */}
        <View className="mt-4 border-t border-gray-100 dark:border-[#38383A] pt-4">
          <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-red-400">
            {t('privacy.dangerSection')}
          </Text>

          <View className="py-4">
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
        </View>
      </View>
    </ScrollView>
  );
}
