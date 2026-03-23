import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useLoginViewModel } from './_login.view-model';

export default function LoginScreen() {
  const { t } = useTranslation();
  const vm = useLoginViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('auth.login.title')}
          </Text>
          <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
            {t('auth.login.subtitle')}
          </Text>

          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.apiError}</Text>
            </View>
          ) : null}

          <FormField
            placeholder={t('auth.login.emailPlaceholder')}
            value={vm.email}
            onChangeText={vm.setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={vm.errors.email}
          />

          <FormField
            placeholder={t('auth.login.passwordPlaceholder')}
            value={vm.password}
            onChangeText={vm.setPassword}
            secureTextEntry
            error={vm.errors.password}
            spacingClassName="mb-2"
          />

          <Pressable className="mb-8 self-end">
            <Text className="text-sm text-primary">{t('auth.login.forgotPassword')}</Text>
          </Pressable>

          <Button
            onPress={vm.handleLogin}
            label={vm.loading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
            disabled={vm.loading}
          />

          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="flex-1 border-b border-gray-200 dark:border-[#38383A]" />
              <Text className="mx-4 text-gray-400 dark:text-neutral-500">{t('common.or')}</Text>
              <View className="flex-1 border-b border-gray-200 dark:border-[#38383A]" />
            </View>

            <Pressable
              onPress={vm.handleGoogleLogin}
              disabled={vm.loading || !vm.googleReady}
              className="mb-3 flex-row items-center justify-center rounded-2xl border border-gray-200 dark:border-[#38383A] py-4"
            >
              <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                {t('auth.login.continueWithGoogle')}
              </Text>
            </Pressable>

            {vm.showAppleLogin ? (
              <Pressable
                onPress={vm.handleAppleLogin}
                disabled={vm.loading}
                className="mb-3 flex-row items-center justify-center rounded-2xl border border-gray-200 dark:border-[#38383A] py-4"
              >
                <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                  {t('auth.login.continueWithApple')}
                </Text>
              </Pressable>
            ) : null}

            {vm.showPasskeyLogin ? (
              <Pressable
                onPress={vm.handlePasskeyLogin}
                disabled={vm.loading}
                className="flex-row items-center justify-center rounded-2xl border border-gray-200 dark:border-[#38383A] py-4"
              >
                <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                  {t('auth.login.continueWithPasskey')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="px-8 pb-8">
          <Pressable onPress={vm.navigateToRegister} className="items-center py-2">
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              {t('auth.login.noAccount')}{' '}
              <Text className="font-semibold text-primary">{t('auth.login.registerLink')}</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
