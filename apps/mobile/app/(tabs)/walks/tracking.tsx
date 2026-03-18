import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoodLogModal } from '@/components/MoodLogModal';
import { useDogsStore } from '@/stores/dogs';
import { useTrackingViewModel } from './tracking.view-model';

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <Text className="text-3xl font-bold text-gray-900 dark:text-[#F5F5F7]">{value}</Text>
      <Text className="mt-1 text-sm text-gray-500 dark:text-neutral-500">{label}</Text>
    </View>
  );
}

export default function TrackingScreen() {
  const vm = useTrackingViewModel();
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const dogs = useDogsStore((s) => s.dogs);
  const activeDogId = selectedDogId ?? dogs[0]?.id ?? null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Traccia passeggiata',
          headerBackTitle: 'Passeggiate',
        }}
      />

      <View className="flex-1 justify-between px-4 py-6">
        {/* Stats display */}
        <View className="space-y-4">
          {/* Timer */}
          <View className="items-center rounded-3xl bg-white dark:bg-[#1C1C1E] p-8 shadow-sm">
            <Text className="text-6xl font-bold tracking-wider text-emerald-700">
              {vm.formattedElapsed}
            </Text>
            <Text className="mt-2 text-base text-gray-500 dark:text-neutral-500">
              {vm.isTracking ? 'In corso' : 'Pronta per partire'}
            </Text>
          </View>

          {/* Distance and speed */}
          <View className="flex-row gap-3">
            <StatBox label="Distanza" value={vm.formattedDistance} />
            <StatBox label="Velocità" value={vm.formattedSpeed} />
          </View>

          {/* Points count */}
          {vm.isTracking ? (
            <View className="items-center">
              <Text className="text-sm text-gray-400 dark:text-neutral-500">
                {vm.points.length} punti GPS registrati
              </Text>
            </View>
          ) : null}
        </View>

        {/* Action buttons */}
        <View className="items-center pb-8">
          {vm.loading ? (
            <ActivityIndicator size="large" color="#065F46" />
          ) : vm.isTracking ? (
            <View className="items-center gap-4">
              <View className="flex-row items-center gap-6">
                {/* SOS button */}
                <Pressable
                  onPress={vm.handleSos}
                  disabled={vm.sosLoading}
                  className="h-16 w-16 items-center justify-center rounded-full bg-orange-500 shadow-lg"
                >
                  {vm.sosLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text className="text-sm font-black text-white">SOS</Text>
                  )}
                </Pressable>

                {/* Stop button */}
                <Pressable
                  onPress={vm.handleStop}
                  className="h-24 w-24 items-center justify-center rounded-full bg-red-500 shadow-lg"
                >
                  <View className="h-8 w-8 rounded-sm bg-white" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={vm.handleStart}
              className="h-24 w-24 items-center justify-center rounded-full bg-emerald-700 shadow-lg"
            >
              <Text className="text-lg font-bold text-white">VAI</Text>
            </Pressable>
          )}

          <Text className="mt-4 text-sm text-gray-400 dark:text-neutral-500">
            {vm.isTracking ? 'Tocca per terminare' : 'Tocca per iniziare'}
          </Text>
        </View>
      </View>
      {vm.completedTrackId && activeDogId && (
        <MoodLogModal
          visible
          dogId={activeDogId}
          trackId={vm.completedTrackId}
          onClose={vm.handleMoodLogDone}
          onSubmit={vm.handleMoodLogDone}
        />
      )}
    </SafeAreaView>
  );
}
