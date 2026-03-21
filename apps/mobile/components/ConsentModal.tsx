import { useTranslation } from 'react-i18next';
import { Linking, Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useConsentModalViewModel } from './ConsentModal.view-model';

interface ConsentModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ConsentModal({ visible, onDismiss }: ConsentModalProps) {
  const { t } = useTranslation();
  const vm = useConsentModalViewModel(onDismiss);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView
        className="flex-1 bg-white dark:bg-[#1C1C1E]"
        contentContainerClassName="px-6 py-8"
      >
        <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
          {t('consent.title')}
        </Text>
        <Text className="mb-6 text-base text-gray-500 dark:text-neutral-500">
          {t('consent.description')}
        </Text>

        {/* Analytics */}
        <View className="mb-4 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">
              {t('consent.analytics.title')}
            </Text>
            <Switch
              value={vm.analytics}
              onValueChange={(v) => vm.setConsent('analytics', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            {t('consent.analytics.description')}
          </Text>
        </View>

        {/* A/B Testing (experiment logging, not remote config) */}
        <View className="mb-4 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">
              {t('consent.abTesting.title')}
            </Text>
            <Switch
              value={vm.abTesting}
              onValueChange={(v) => vm.setConsent('abTesting', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            {t('consent.abTesting.description')}
          </Text>
        </View>

        {/* Error Tracking — enriches Sentry reports with full context */}
        <View className="mb-4 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">
              {t('consent.errorTracking.title')}
            </Text>
            <Switch
              value={vm.errorTracking}
              onValueChange={(v) => vm.setConsent('errorTracking', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            {t('consent.errorTracking.description')}
          </Text>
        </View>

        {/* AI Training */}
        <View className="mb-4 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">
              {t('consent.aiTraining.title')}
            </Text>
            <Switch
              value={vm.aiTraining}
              onValueChange={(v) => vm.setConsent('aiTraining', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            {t('consent.aiTraining.description')}
          </Text>
        </View>

        {/* Marketing */}
        <View className="mb-6 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">
              {t('consent.marketing.title')}
            </Text>
            <Switch
              value={vm.marketing}
              onValueChange={(v) => vm.setConsent('marketing', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">
            {t('consent.marketing.description')}
          </Text>
        </View>

        {/* Actions */}
        <Pressable
          onPress={vm.acceptSelected}
          className="mb-3 items-center rounded-xl bg-primary px-6 py-4"
        >
          <Text className="text-base font-semibold text-white">{t('consent.acceptSelected')}</Text>
        </Pressable>

        <Pressable onPress={vm.rejectAll} className="items-center rounded-xl px-6 py-4">
          <Text className="text-base font-medium text-gray-500 dark:text-neutral-500">
            {t('consent.rejectAll')}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => Linking.openURL(`${process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pawmeet.io'}/privacy`)}
          className="mt-4 items-center"
        >
          <Text className="text-sm text-gray-400 dark:text-neutral-500 underline">
            {t('consent.readPrivacyPolicy')}
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}
