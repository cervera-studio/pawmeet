import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePostUpload } from '@/hooks/usePostUpload';

export default function StoryCreateModal() {
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
      Alert.alert('Errore', 'Impossibile pubblicare la storia');
    }
  }, [selectedMedia, uploadStory, router]);

  return (
    <SafeAreaView className="flex-1 bg-black">
      <Stack.Screen options={{ title: 'Nuova storia', headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-white">Annulla</Text>
        </Pressable>
        <Text className="text-base font-semibold text-white">Nuova storia</Text>
        <Pressable onPress={handlePublish} disabled={!selectedMedia || uploading}>
          <Text
            className={`text-base font-semibold ${selectedMedia && !uploading ? 'text-emerald-400' : 'text-gray-500'}`}
          >
            {uploading ? 'Pubblicando...' : 'Pubblica'}
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
            <Text className="text-base text-white">Tocca per selezionare</Text>
          </Pressable>
        )}
      </View>

      {/* Change media button */}
      {selectedMedia ? (
        <View className="items-center pb-4">
          <Pressable onPress={pickMedia} className="rounded-full bg-white/20 px-6 py-2">
            <Text className="text-sm text-white">Cambia</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
