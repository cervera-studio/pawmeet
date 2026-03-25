import { MIN_USER_AGE } from '@pawmeet/config';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useAgeGateViewModel } from './_vm/age-gate.view-model';

export default function AgeGateScreen() {
  const { t } = useTranslation();
  const vm = useAgeGateViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-8"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('auth.ageGate.title')}
          </Text>
          <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
            {t('auth.ageGate.description', { age: MIN_USER_AGE })}
          </Text>

          {vm.error ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.error}</Text>
            </View>
          ) : null}

          <FormField
            placeholder={t('auth.ageGate.dateOfBirthPlaceholder')}
            value={vm.dateOfBirth}
            onChangeText={vm.setDateOfBirth}
            keyboardType="numbers-and-punctuation"
            error={undefined}
            spacingClassName="mb-8"
          />

          <Button
            onPress={vm.handleSubmit}
            label={vm.loading ? t('auth.ageGate.submitting') : t('auth.ageGate.submitButton')}
            disabled={vm.loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
