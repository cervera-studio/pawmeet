export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { Stack } from 'expo-router';
import { Image, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { TagOption } from './create.view-model';
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

        {/* Tags */}
        <Pressable
          onPress={() => vm.setShowTagPicker(!vm.showTagPicker)}
          className="mb-4 rounded-xl bg-gray-50 p-4"
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🏷️</Text>
            <Text className="text-sm text-gray-700">
              {vm.selectedTags.length > 0
                ? `${vm.selectedTags.length} tag selezionati`
                : 'Tagga persone o cani'}
            </Text>
          </View>

          {/* Selected tags preview */}
          {vm.selectedTags.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap gap-1">
              {vm.selectedTags.map((tag: TagOption) => (
                <Pressable
                  key={`${tag.type}-${tag.id}`}
                  onPress={() => vm.toggleTag(tag)}
                  className="flex-row items-center gap-1 rounded-full bg-emerald-100 px-2 py-1"
                >
                  <Text className="text-xs text-emerald-800">{tag.name}</Text>
                  <Text className="text-xs text-emerald-600">✕</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Pressable>

        {/* Tag picker */}
        {vm.showTagPicker && vm.tagOptions.length > 0 ? (
          <View className="mb-4 rounded-xl border border-gray-100 bg-white">
            {vm.tagOptions.map((option: TagOption) => {
              const isSelected = vm.selectedTags.some(
                (t: TagOption) => t.type === option.type && t.id === option.id,
              );
              return (
                <Pressable
                  key={`${option.type}-${option.id}`}
                  onPress={() => vm.toggleTag(option)}
                  className={`flex-row items-center justify-between border-b border-gray-50 px-4 py-3 ${isSelected ? 'bg-emerald-50' : ''}`}
                >
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm">{option.type === 'user' ? '👤' : '🐕'}</Text>
                    <Text className="text-sm text-gray-800">{option.name}</Text>
                  </View>
                  {isSelected ? <Text className="text-sm text-emerald-700">✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

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
