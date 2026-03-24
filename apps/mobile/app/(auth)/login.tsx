import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useLoginViewModel } from './_login.view-model';

function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="white">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

function OrSeparator({ label }: { label: string }) {
  return (
    <View className="mb-4 flex-row items-center">
      <View className="flex-1 border-b border-gray-200 dark:border-[#38383A]" />
      <Text className="mx-4 text-gray-400 dark:text-neutral-500">{label}</Text>
      <View className="flex-1 border-b border-gray-200 dark:border-[#38383A]" />
    </View>
  );
}

export default function LoginScreen() {
  const { t } = useTranslation();
  const vm = useLoginViewModel();

  const ssoButtons = (
    <>
      {Platform.OS === 'ios' && vm.showAppleLogin ? (
        <Pressable
          onPress={vm.handleAppleLogin}
          disabled={vm.loading}
          className="mb-3 flex-row items-center justify-center rounded-2xl bg-black py-4"
        >
          <AppleIcon />
          <Text className="ml-2 text-base font-medium text-white">
            {t('auth.login.continueWithApple')}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={vm.handleGoogleLogin}
        disabled={vm.loading || !vm.googleReady}
        className="mb-3 flex-row items-center justify-center rounded-2xl border border-gray-200 dark:border-[#38383A] py-4"
      >
        <GoogleIcon />
        <Text className="ml-2 text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('auth.login.continueWithGoogle')}
        </Text>
      </Pressable>
    </>
  );

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
                {ssoButtons}
              </View>
            </>
          ) : (
            <>
              {/* Step 2: Password (email shown as context, editable via back) */}
              <Pressable onPress={vm.handleBack} className="mb-4">
                <Text className="text-base text-primary font-medium">
                  ← {vm.email}
                </Text>
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
                <Text className="text-sm text-primary">
                  {t('auth.login.forgotPassword')}
                </Text>
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
