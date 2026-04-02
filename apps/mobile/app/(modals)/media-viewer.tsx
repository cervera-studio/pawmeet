import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from '@/hooks/useScreenSecurity';

const VALID_MEDIA_TYPES = new Set(['image', 'video']);

function isValidMediaUrl(raw: string): boolean {
  try {
    const parsed = new URL(decodeURIComponent(raw));
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function MediaViewerScreen() {
  usePreventScreenCapture();
  const { t } = useTranslation();
  const { url, mediaType } = useLocalSearchParams<{ url: string; mediaType: string }>();
  const router = useRouter();

  const decodedUrl = url && isValidMediaUrl(url) ? decodeURIComponent(url) : '';
  const validMediaType = mediaType && VALID_MEDIA_TYPES.has(mediaType) ? mediaType : 'image';

  const player = useVideoPlayer(validMediaType === 'video' ? decodedUrl : null, (p) => {
    p.play();
  });

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />

      {/* Close button */}
      <SafeAreaView edges={['top']} className="absolute right-4 top-0 z-10">
        <Pressable
          onPress={() => router.back()}
          className="mt-2 h-10 w-10 items-center justify-center rounded-full bg-black/50"
          accessibilityLabel={t('common.close')}
          accessibilityRole="button"
        >
          <Text className="text-lg font-bold text-white">✕</Text>
        </Pressable>
      </SafeAreaView>

      {/* Media content */}
      <View className="flex-1 items-center justify-center">
        {validMediaType === 'video' ? (
          <VideoView
            player={player}
            nativeControls
            contentFit="contain"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Image
            source={{ uri: decodedUrl }}
            resizeMode="contain"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </View>
    </View>
  );
}
