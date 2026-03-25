import { useTranslation } from 'react-i18next';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useReportViewModel } from './_vm/report.view-model';

export default function ReportModal() {
  const { t } = useTranslation();
  const vm = useReportViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <View className="flex-1 px-6 py-4">
        <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
          {t('report.title')}
        </Text>
        <Text className="mb-6 text-base text-gray-500 dark:text-neutral-500">
          {t('report.subtitle')}
        </Text>

        <View className="gap-2">
          {vm.reasons.map((reason) => {
            const isSelected = vm.selectedReason === reason.key;
            return (
              <Pressable
                key={reason.key}
                onPress={() => vm.setSelectedReason(reason.key)}
                className={`rounded-xl border px-4 py-3 ${
                  isSelected
                    ? 'border-emerald-700 bg-emerald-50'
                    : 'border-gray-200 dark:border-[#38383A]'
                }`}
              >
                <Text
                  className={`text-base ${
                    isSelected
                      ? 'font-medium text-emerald-800'
                      : 'text-gray-700 dark:text-[#D1D1D6]'
                  }`}
                >
                  {reason.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          className="mt-4 h-24 rounded-xl border border-gray-200 dark:border-[#38383A] p-4 text-base text-gray-900 dark:text-[#F5F5F7]"
          placeholder={t('report.detailsPlaceholder')}
          value={vm.description}
          onChangeText={vm.setDescription}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />

        <View className="mt-6">
          <Button
            onPress={vm.handleSubmit}
            label={vm.submitting ? t('report.submitting') : t('report.submitButton')}
            disabled={!vm.canSubmit}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
