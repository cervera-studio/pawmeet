import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { OrSeparator, SocialAuthButtons } from '@/components/SocialAuth';
import { useRegisterViewModel } from './_vm/register.view-model';

function EmailIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#065F46" strokeWidth={2}>
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Path d="m22 6-10 7L2 6" />
    </Svg>
  );
}

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const vm = useRegisterViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <View className="flex-1 justify-center px-8">
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

        <Pressable
          onPress={() => router.push('/(auth)/register-email')}
          className="mb-3 flex-row items-center justify-center rounded-2xl border border-gray-200 dark:border-[#38383A] py-4"
        >
          <EmailIcon />
          <Text className="ml-2 text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
            {t('auth.register.signUpWithEmail')}
          </Text>
        </Pressable>

        <View className="mt-4">
          <OrSeparator label={t('common.or')} />
        </View>

        <SocialAuthButtons
          showAppleLogin={vm.showAppleLogin}
          googleReady={vm.googleReady}
          loading={vm.loading}
          onAppleLogin={vm.handleAppleLogin}
          onGoogleLogin={vm.handleGoogleLogin}
        />

        <Text className="mt-4 text-center text-sm text-gray-400 dark:text-neutral-500">
          {t('auth.register.terms')}
        </Text>
      </View>

      <View className="px-8 pb-8">
        <Pressable onPress={vm.navigateToLogin} className="items-center py-2">
          <Text className="text-base text-gray-500 dark:text-neutral-500">
            {t('auth.register.hasAccount')}{' '}
            <Text className="font-semibold text-primary">{t('auth.register.loginLink')}</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
