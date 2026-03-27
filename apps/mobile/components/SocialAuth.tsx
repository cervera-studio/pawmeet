import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export function AppleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="white">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </Svg>
  );
}

export function GoogleIcon() {
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

export function OrSeparator({ label }: { label: string }) {
  return (
    <View className="mb-4 flex-row items-center">
      <View className="flex-1 border-b border-gray-200 dark:border-[#38383A]" />
      <Text className="mx-4 text-gray-400 dark:text-neutral-500">{label}</Text>
      <View className="flex-1 border-b border-gray-200 dark:border-[#38383A]" />
    </View>
  );
}

type SocialAuthButtonsProps = {
  showAppleLogin: boolean;
  googleReady: boolean;
  loading: boolean;
  onAppleLogin: () => void;
  onGoogleLogin: () => void;
};

export function SocialAuthButtons({
  showAppleLogin,
  googleReady,
  loading,
  onAppleLogin,
  onGoogleLogin,
}: SocialAuthButtonsProps) {
  const { t } = useTranslation();

  return (
    <>
      {Platform.OS === 'ios' && showAppleLogin ? (
        <Pressable
          onPress={onAppleLogin}
          disabled={loading}
          className="mb-3 flex-row items-center justify-center rounded-2xl bg-black py-4"
        >
          <AppleIcon />
          <Text className="ml-2 text-base font-medium text-white">
            {t('auth.login.continueWithApple')}
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={onGoogleLogin}
        disabled={loading || !googleReady}
        className="mb-3 flex-row items-center justify-center rounded-2xl border border-gray-200 dark:border-[#38383A] py-4"
      >
        <GoogleIcon />
        <Text className="ml-2 text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
          {t('auth.login.continueWithGoogle')}
        </Text>
      </Pressable>
    </>
  );
}
