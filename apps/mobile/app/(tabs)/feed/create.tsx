export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { Stack } from 'expo-router';
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreatePostViewModel } from './create.view-model';

export default function CreatePostScreen() {
  const vm = useCreatePostViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Nuovo post',
          headerBackTitle: 'Feed',
        }}
      />

      <ScrollView className="flex-1 px-4 pt-4">
        {/* Caption */}
        <TextInput
          className="mb-4 min-h-[80px] rounded-xl bg-gray-50 p-4 text-base text-gray-900"
          placeholder="Scrivi una didascalia..."
          value={vm.caption}
          onChangeText={vm.setCaption}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />

        {/* Media Grid */}
        <View className="mb-4 flex-row flex-wrap gap-2">
          {vm.selectedMedia.map((media, index) => (
            <View key={media.uri} className="relative">
              <Image
                source={{ uri: media.uri }}
                className="h-24 w-24 rounded-lg"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => vm.removeMedia(index)}
                className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full bg-red-500"
              >
                <Text className="text-xs font-bold text-white">✕</Text>
              </Pressable>
              {media.type.startsWith('video/') ? (
                <View className="absolute bottom-1 left-1 rounded bg-black/60 px-1">
                  <Text className="text-xs text-white">Video</Text>
                </View>
              ) : null}
            </View>
          ))}

          {vm.selectedMedia.length < 10 ? (
            <Pressable
              onPress={vm.pickMedia}
              className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300"
            >
              <Text className="text-2xl text-gray-400">+</Text>
              <Text className="text-xs text-gray-400">Aggiungi</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Location toggle */}
        <View className="mb-4 flex-row items-center justify-between rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">📍</Text>
            <Text className="text-sm text-gray-700">Includi posizione</Text>
          </View>
          <Switch
            value={vm.includeLocation}
            onValueChange={vm.setIncludeLocation}
            trackColor={{ true: '#065F46' }}
          />
        </View>

        {/* Upload progress */}
        {vm.uploading ? (
          <View className="mb-4 rounded-xl bg-emerald-50 p-4">
            <Text className="text-sm font-medium text-emerald-800">
              Caricamento {vm.progress.current}/{vm.progress.total}...
            </Text>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-200">
              <View
                className="h-full rounded-full bg-emerald-700"
                style={{
                  width:
                    vm.progress.total > 0
                      ? `${(vm.progress.current / vm.progress.total) * 100}%`
                      : '0%',
                }}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Submit button */}
      <View className="border-t border-gray-100 px-4 py-3">
        <Pressable
          onPress={vm.handleSubmit}
          disabled={!vm.canSubmit}
          className={`items-center rounded-xl py-3 ${vm.canSubmit ? 'bg-emerald-800' : 'bg-gray-300'}`}
        >
          <Text className="text-base font-semibold text-white">
            {vm.uploading ? 'Pubblicando...' : 'Pubblica'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
