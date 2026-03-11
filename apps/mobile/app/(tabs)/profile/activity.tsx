import { Stack } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivityViewModel } from './activity.view-model';

function ProgressBar({ progress, label }: { progress: number; label: string }) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  return (
    <View className="mb-2">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-sm text-gray-600">{label}</Text>
        <Text className="text-sm font-semibold text-emerald-700">{Math.round(clamped * 100)}%</Text>
      </View>
      <View className="h-3 rounded-full bg-gray-200">
        <View className="h-3 rounded-full bg-emerald-600" style={{ width: `${clamped * 100}%` }} />
      </View>
    </View>
  );
}

function StatCard({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-baseline gap-1">
        <Text className="text-2xl font-bold text-gray-900">{value}</Text>
        <Text className="text-sm text-gray-500">{unit}</Text>
      </View>
      <Text className="mt-1 text-xs text-gray-400">{label}</Text>
    </View>
  );
}

export default function ActivityScreen() {
  const vm = useActivityViewModel();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Attività',
          headerBackTitle: 'Profilo',
        }}
      />

      {vm.loading && !vm.stats ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#065F46" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
          {/* Period toggle */}
          <View className="mb-4 flex-row rounded-xl bg-white p-1 shadow-sm">
            <Pressable
              onPress={() => vm.changePeriod('week')}
              className={`flex-1 items-center rounded-lg py-2 ${
                vm.period === 'week' ? 'bg-emerald-700' : ''
              }`}
            >
              <Text
                className={`font-medium ${vm.period === 'week' ? 'text-white' : 'text-gray-600'}`}
              >
                Settimana
              </Text>
            </Pressable>
            <Pressable
              onPress={() => vm.changePeriod('month')}
              className={`flex-1 items-center rounded-lg py-2 ${
                vm.period === 'month' ? 'bg-emerald-700' : ''
              }`}
            >
              <Text
                className={`font-medium ${vm.period === 'month' ? 'text-white' : 'text-gray-600'}`}
              >
                Mese
              </Text>
            </Pressable>
          </View>

          {vm.stats ? (
            <>
              {/* Summary stats */}
              <View className="mb-4 flex-row gap-3">
                <StatCard
                  value={vm.stats.summary.totalDistanceKm.toFixed(1)}
                  unit="km"
                  label="Distanza totale"
                />
                <StatCard value={String(vm.stats.summary.totalWalks)} unit="" label="Passeggiate" />
              </View>

              <View className="mb-4 flex-row gap-3">
                <StatCard
                  value={String(Math.round(vm.stats.summary.totalDurationMin))}
                  unit="min"
                  label="Tempo totale"
                />
                <StatCard
                  value={String(Math.round(vm.stats.summary.totalSteps))}
                  unit=""
                  label="Passi totali"
                />
              </View>

              {/* Daily averages */}
              <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
                <Text className="mb-3 text-base font-semibold text-gray-900">
                  Medie giornaliere
                </Text>
                <View className="flex-row justify-around">
                  <View className="items-center">
                    <Text className="text-xl font-bold text-emerald-700">
                      {vm.stats.summary.avgDailyDistanceKm.toFixed(1)}
                    </Text>
                    <Text className="text-xs text-gray-500">km/giorno</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xl font-bold text-emerald-700">
                      {Math.round(vm.stats.summary.avgDailyDurationMin)}
                    </Text>
                    <Text className="text-xs text-gray-500">min/giorno</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xl font-bold text-emerald-700">
                      {Math.round(vm.stats.summary.avgDailySteps)}
                    </Text>
                    <Text className="text-xs text-gray-500">passi/giorno</Text>
                  </View>
                </View>
              </View>

              {/* Daily breakdown */}
              {vm.stats.summary.days.length > 0 ? (
                <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
                  <Text className="mb-3 text-base font-semibold text-gray-900">
                    Dettaglio giornaliero
                  </Text>
                  {vm.stats.summary.days.map((day) => (
                    <View
                      key={day.date}
                      className="flex-row items-center justify-between border-b border-gray-50 py-2"
                    >
                      <Text className="text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <View className="flex-row gap-4">
                        <Text className="text-sm text-gray-900">
                          {day.walkDistanceKm.toFixed(1)} km
                        </Text>
                        <Text className="text-sm text-gray-500">{day.walkDurationMin} min</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}

          {/* Health goal */}
          {vm.healthGoal ? (
            <View className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
              <Text className="mb-3 text-base font-semibold text-gray-900">
                Obiettivo giornaliero
              </Text>
              <ProgressBar
                progress={vm.healthGoal.goal.goalProgress}
                label={`${Math.round(vm.healthGoal.goal.currentDailyAvgMinutes)} / ${vm.healthGoal.goal.recommendedDailyMinutes} min`}
              />
              <Text className="mt-1 text-xs text-gray-400">
                Basato sulla taglia del tuo cane ({vm.healthGoal.goal.sizeCategory})
              </Text>
            </View>
          ) : null}

          {/* Dog selector */}
          {vm.dogs.length > 1 ? (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-gray-600">Seleziona cane</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {vm.dogs.map((dog) => (
                  <Pressable
                    key={dog.id}
                    onPress={() => vm.selectDog(dog.id)}
                    className={`mr-2 rounded-full px-4 py-2 ${
                      vm.selectedDogId === dog.id ? 'bg-emerald-700' : 'bg-white'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        vm.selectedDogId === dog.id ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {dog.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
