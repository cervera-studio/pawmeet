import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useForgotPasswordViewModel } from './_vm/forgot-password.view-model';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const vm = useForgotPasswordViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {vm.phase === 'reset'
              ? t('auth.forgotPassword.resetTitle')
              : t('auth.forgotPassword.title')}
          </Text>
          <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
            {vm.phase === 'request'
              ? t('auth.forgotPassword.subtitle')
              : vm.phase === 'sent'
                ? t('auth.forgotPassword.sentSubtitle')
                : t('auth.forgotPassword.resetSubtitle')}
          </Text>

          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.apiError}</Text>
            </View>
          ) : null}

          {vm.phase === 'request' ? (
            <>
              <FormField
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
                value={vm.email}
                onChangeText={vm.setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={vm.errors.email}
              />

              <Button
                onPress={vm.handleRequestReset}
                label={
                  vm.loading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendCode')
                }
                disabled={vm.loading}
              />
            </>
          ) : vm.phase === 'sent' ? (
            <>
              <Button
                onPress={vm.goToReset}
                label={t('auth.forgotPassword.iReceivedCode')}
              />

              <Pressable onPress={vm.handleRequestReset} className="mt-4 items-center py-2">
                <Text className="text-base text-gray-500 dark:text-neutral-500">
                  {t('auth.forgotPassword.didNotReceive')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <FormField
                placeholder={t('auth.forgotPassword.otpPlaceholder')}
                value={vm.otp}
                onChangeText={vm.setOtp}
                keyboardType="number-pad"
                maxLength={6}
                error={vm.errors.otp}
              />

              <FormField
                placeholder={t('auth.forgotPassword.newPasswordPlaceholder')}
                value={vm.newPassword}
                onChangeText={vm.setNewPassword}
                secureTextEntry
                error={vm.errors.newPassword}
              />

              <FormField
                placeholder={t('auth.forgotPassword.confirmPasswordPlaceholder')}
                value={vm.confirmPassword}
                onChangeText={vm.setConfirmPassword}
                secureTextEntry
                error={vm.errors.confirmPassword}
                spacingClassName="mb-2"
              />

              <Pressable
                onPress={vm.handleResendCode}
                disabled={vm.resendDisabled}
                className="mb-6 self-end"
              >
                <Text
                  className={`text-sm ${vm.resendDisabled ? 'text-gray-400 dark:text-neutral-600' : 'text-primary'}`}
                >
                  {t('auth.forgotPassword.resendCode')}
                </Text>
              </Pressable>

              <Button
                onPress={vm.handleResetPassword}
                label={
                  vm.loading
                    ? t('auth.forgotPassword.resetting')
                    : t('auth.forgotPassword.resetButton')
                }
                disabled={vm.loading}
              />
            </>
          )}
        </View>

        <View className="px-8 pb-8">
          <Pressable onPress={vm.navigateToLogin} className="items-center py-2">
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              {t('auth.forgotPassword.backToLogin')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
