import { ResizeMode, Video } from 'expo-av';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePreventScreenCapture } from '@/hooks/useScreenSecurity';

export default function MediaViewerScreen() {
  usePreventScreenCapture();
  const { url, mediaType } = useLocalSearchParams<{ url: string; mediaType: string }>();
  const router = useRouter();

  const decodedUrl = url ? decodeURIComponent(url) : '';

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />

      {/* Close button */}
      <SafeAreaView edges={['top']} className="absolute right-4 top-0 z-10">
        <Pressable
          onPress={() => router.back()}
          className="mt-2 h-10 w-10 items-center justify-center rounded-full bg-black/50"
          accessibilityLabel="Chiudi"
          accessibilityRole="button"
        >
          <Text className="text-lg font-bold text-white">✕</Text>
        </Pressable>
      </SafeAreaView>

      {/* Media content */}
      <View className="flex-1 items-center justify-center">
        {mediaType === 'video' ? (
          <Video
            source={{ uri: decodedUrl }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls
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
