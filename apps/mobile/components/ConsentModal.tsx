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
        {vm.showDetail ? <DetailView vm={vm} t={t} /> : <SimpleView vm={vm} t={t} />}

        {/* Privacy Policy link */}
        <Pressable
          onPress={() =>
            Linking.openURL(`${process.env.EXPO_PUBLIC_WEB_URL ?? 'https://pawmeet.io'}/privacy`)
          }
          className="mt-6 items-center"
        >
          <Text className="text-sm text-gray-400 dark:text-neutral-500 underline">
            {t('consent.readPrivacyPolicy')}
          </Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

/** Step 1 — Simple choice: accept all, reject, or customize */
function SimpleView({
  vm,
  t,
}: {
  vm: ReturnType<typeof useConsentModalViewModel>;
  t: (key: string) => string;
}) {
  return (
    <>
      <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('consent.simpleTitle')}
      </Text>
      <Text className="mb-8 text-base leading-6 text-gray-500 dark:text-neutral-400">
        {t('consent.simpleDescription')}
      </Text>

      {/* Accept all — primary CTA */}
      <Pressable
        onPress={vm.acceptAll}
        className="mb-3 items-center rounded-xl bg-primary px-6 py-4"
      >
        <Text className="text-base font-semibold text-white">{t('consent.acceptAll')}</Text>
      </Pressable>

      {/* Reject all — secondary */}
      <Pressable onPress={vm.rejectAll} className="mb-4 items-center rounded-xl px-6 py-4">
        <Text className="text-base font-medium text-gray-500 dark:text-neutral-500">
          {t('consent.rejectAllShort')}
        </Text>
      </Pressable>

      {/* Customize — tertiary link */}
      <Pressable onPress={vm.openDetail} className="items-center py-2">
        <Text className="text-sm text-gray-400 dark:text-neutral-500 underline">
          {t('consent.customize')}
        </Text>
      </Pressable>
    </>
  );
}

/** Step 2 — Detail view with individual toggles (no A/B testing, merged with analytics) */
function DetailView({
  vm,
  t,
}: {
  vm: ReturnType<typeof useConsentModalViewModel>;
  t: (key: string) => string;
}) {
  return (
    <>
      {/* Back button */}
      <Pressable onPress={vm.closeDetail} className="mb-4">
        <Text className="text-base text-primary font-medium">← {t('common.back')}</Text>
      </Pressable>

      <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('consent.title')}
      </Text>
      <Text className="mb-6 text-base text-gray-500 dark:text-neutral-400">
        {t('consent.description')}
      </Text>

      {/* Analytics — includes A/B testing internally */}
      <ConsentRow
        title={t('consent.analytics.title')}
        description={t('consent.analytics.description')}
        value={vm.analytics}
        onValueChange={(v) => vm.setConsent('analytics', v)}
      />

      {/* Error Tracking */}
      <ConsentRow
        title={t('consent.errorTracking.title')}
        description={t('consent.errorTracking.description')}
        value={vm.errorTracking}
        onValueChange={(v) => vm.setConsent('errorTracking', v)}
      />

      {/* AI Training */}
      <ConsentRow
        title={t('consent.aiTraining.title')}
        description={t('consent.aiTraining.description')}
        value={vm.aiTraining}
        onValueChange={(v) => vm.setConsent('aiTraining', v)}
      />

      {/* Marketing */}
      <ConsentRow
        title={t('consent.marketing.title')}
        description={t('consent.marketing.description')}
        value={vm.marketing}
        onValueChange={(v) => vm.setConsent('marketing', v)}
        isLast
      />

      {/* Save */}
      <Pressable
        onPress={vm.acceptSelected}
        className="mt-6 items-center rounded-xl bg-primary px-6 py-4"
      >
        <Text className="text-base font-semibold text-white">{t('consent.savePreferences')}</Text>
      </Pressable>
    </>
  );
}

/** Clean list row for a consent toggle (no card wrapper) */
function ConsentRow({
  title,
  description,
  value,
  onValueChange,
  isLast = false,
}: {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View className={`py-4 ${isLast ? '' : 'border-b border-gray-100 dark:border-neutral-800'}`}>
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 text-base font-medium text-gray-800 dark:text-[#F5F5F7]">
          {title}
        </Text>
        <Switch value={value} onValueChange={onValueChange} trackColor={{ true: '#065F46' }} />
      </View>
      <Text className="mt-1 pr-14 text-sm text-gray-400 dark:text-neutral-500">{description}</Text>
    </View>
  );
}
