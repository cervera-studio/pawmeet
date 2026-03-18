import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useRegisterViewModel } from './register.view-model';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const vm = useRegisterViewModel();

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

          <FormField
            placeholder={t('auth.register.dateOfBirthPlaceholder')}
            value={vm.dateOfBirth}
            onChangeText={vm.setDateOfBirth}
            keyboardType="numbers-and-punctuation"
            error={vm.errors.dateOfBirth}
            spacingClassName="mb-8"
          />

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
