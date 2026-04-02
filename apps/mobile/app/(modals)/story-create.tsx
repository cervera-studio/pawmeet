import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePostUpload } from '@/hooks/usePostUpload';

export default function StoryCreateModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { uploading, uploadStory } = usePostUpload();
  const [selectedMedia, setSelectedMedia] = useState<{
    uri: string;
    type: string;
    fileSize: number;
  } | null>(null);

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedMedia({
        uri: asset.uri,
        type: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        fileSize: asset.fileSize ?? 0,
      });
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (!selectedMedia) return;

    const success = await uploadStory(selectedMedia);
    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert(t('common.error'), t('feed.story.publishError'));
    }
  }, [selectedMedia, uploadStory, router, t]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen options={{ title: t('feed.story.title'), headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-white">{t('common.cancel')}</Text>
        </Pressable>
        <Text className="text-base font-semibold text-white">{t('feed.story.title')}</Text>
        <Pressable onPress={handlePublish} disabled={!selectedMedia || uploading}>
          <Text
            className={`text-base font-semibold ${selectedMedia && !uploading ? 'text-emerald-400' : 'text-gray-500'}`}
          >
            {uploading ? t('common.publishing') : t('common.publish')}
          </Text>
        </Pressable>
      </View>

      {/* Preview */}
      <View className="flex-1 items-center justify-center">
        {selectedMedia ? (
          <Image
            source={{ uri: selectedMedia.uri }}
            className="h-full w-full"
            resizeMode="contain"
          />
        ) : (
          <Pressable onPress={pickMedia} className="items-center">
            <Text className="mb-2 text-5xl">📷</Text>
            <Text className="text-base text-white">{t('feed.story.tapToSelect')}</Text>
          </Pressable>
        )}
      </View>

      {/* Change media button */}
      {selectedMedia ? (
        <View className="items-center pb-4">
          <Pressable onPress={pickMedia} className="rounded-full bg-white/20 px-6 py-2">
            <Text className="text-sm text-white">{t('common.change')}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
