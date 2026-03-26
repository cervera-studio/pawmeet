import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { OrSeparator, SocialAuthButtons } from '@/components/SocialAuth';
import { Button } from '@/components/ui/Button';
import { useLoginViewModel } from './_vm/login.view-model';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
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

          {vm.step === 'email' ? (
            <>
              {/* Step 1: Email only */}
              <FormField
                placeholder={t('auth.login.emailPlaceholder')}
                value={vm.email}
                onChangeText={vm.setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
                error={vm.errors.email}
              />

              <Button
                onPress={vm.handleContinue}
                label={vm.loading ? t('common.loading') : t('auth.login.continueButton')}
                disabled={vm.loading}
              />

              <View className="mt-8">
                <OrSeparator label={t('common.or')} />
                <SocialAuthButtons
                  showAppleLogin={vm.showAppleLogin}
                  googleReady={vm.googleReady}
                  loading={vm.loading}
                  onAppleLogin={vm.handleAppleLogin}
                  onGoogleLogin={vm.handleGoogleLogin}
                />
              </View>
            </>
          ) : (
            <>
              {/* Step 2: Password (email shown as context, editable via back) */}
              <Pressable onPress={vm.handleBack} className="mb-4">
                <Text className="text-base text-primary font-medium">← {vm.email}</Text>
              </Pressable>

              <FormField
                placeholder={t('auth.login.passwordPlaceholder')}
                value={vm.password}
                onChangeText={vm.setPassword}
                secureTextEntry
                autoFocus
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
            </>
          )}
        </View>

        <View className="px-8 pb-8">
          <Pressable onPress={vm.navigateToRegister} className="items-center py-2">
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              {t('auth.login.noAccount')}{' '}
              <Text className="font-semibold text-primary">{t('auth.login.registerLink')}</Text>
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(auth)/welcome')} className="items-center py-2">
            <Text className="text-sm text-gray-400 dark:text-neutral-600">
              {t('auth.login.discoverLink')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
