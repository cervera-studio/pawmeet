import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useRegisterViewModel } from './_vm/register.view-model';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const vm = useRegisterViewModel();
  const [showDatePicker, setShowDatePicker] = useState(false);

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
            {t('auth.register.title')}
          </Text>
          <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
            {t('auth.register.subtitle')}
          </Text>

          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.apiError}</Text>
            </View>
          ) : null}

          <FormField
            placeholder={t('auth.register.namePlaceholder')}
            value={vm.displayName}
            onChangeText={vm.setDisplayName}
            error={vm.errors.displayName}
          />

          <FormField
            placeholder={t('auth.register.emailPlaceholder')}
            value={vm.email}
            onChangeText={vm.setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={vm.errors.email}
          />

          <FormField
            placeholder={t('auth.register.passwordPlaceholder')}
            value={vm.password}
            onChangeText={vm.setPassword}
            secureTextEntry
            error={vm.errors.password}
          />

          <FormField
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            value={vm.confirmPassword}
            onChangeText={vm.setConfirmPassword}
            secureTextEntry
            error={vm.errors.confirmPassword}
          />

          <View>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="mb-1 min-h-[52px] justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#38383A] dark:bg-[#2C2C2E]"
            >
              <Text
                className={
                  vm.dateOfBirth
                    ? 'text-base text-gray-900 dark:text-[#F5F5F7]'
                    : 'text-base text-[#9CA3AF]'
                }
              >
                {vm.dateOfBirth
                  ? vm.dateOfBirth.toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : t('auth.register.dateOfBirthPlaceholder')}
              </Text>
            </Pressable>
            {vm.errors.dateOfBirth ? (
              <Text className="mb-3 px-1 text-sm text-red-500">{vm.errors.dateOfBirth}</Text>
            ) : (
              <View className="mb-8" />
            )}
            {showDatePicker ? (
              <DateTimePicker
                value={vm.dateOfBirth ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={(_event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    vm.setDateOfBirth(selectedDate);
                  }
                }}
              />
            ) : null}
          </View>

          <Button
            onPress={vm.handleRegister}
            label={vm.loading ? t('auth.register.registering') : t('auth.register.registerButton')}
            disabled={vm.loading}
          />

          <Text className="mt-4 text-center text-sm text-gray-400 dark:text-neutral-500">
            {t('auth.register.terms')}
          </Text>

          <Pressable onPress={vm.navigateToLogin} className="mt-6 items-center py-2">
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              {t('auth.register.hasAccount')}{' '}
              <Text className="font-semibold text-primary">{t('auth.register.loginLink')}</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
