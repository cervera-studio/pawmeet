import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMatchingInsightsViewModel } from './_matching-insights.view-model';

export default function MatchingInsightsScreen() {
  const vm = useMatchingInsightsViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]" edges={['bottom']}>
      <ScrollView className="flex-1 px-4 pt-4">
        {/* Dog selector */}
        {vm.dogs.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            {vm.dogs.map((dog) => (
              <Pressable
                key={dog.id}
                onPress={() => vm.selectDog(dog.id)}
                className={`mr-2 rounded-full px-4 py-2 ${
                  vm.selectedDogId === dog.id ? 'bg-emerald-800' : 'bg-zinc-100 dark:bg-[#38383A]'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    vm.selectedDogId === dog.id ? 'text-white' : 'text-zinc-700 dark:text-[#D1D1D6]'
                  }`}
                >
                  {dog.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {vm.loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#065F46" />
          </View>
        ) : null}
        {!vm.loading && vm.insights ? (
          <View className="gap-4 pb-6">
            {/* Stats overview */}
            <View className="rounded-xl bg-emerald-50 p-4">
              <Text className="mb-3 text-lg font-bold text-emerald-900">Panoramica</Text>
              <View className="flex-row flex-wrap gap-3">
                <StatCard label="Swipe totali" value={String(vm.insights.totalSwipes)} />
                <StatCard label="Like dati" value={String(vm.insights.totalLikes)} />
                <StatCard label="Match" value={String(vm.insights.totalMatches)} />
                <StatCard label="Tasso match" value={vm.insights.matchRate} />
              </View>
            </View>

            {/* Preference dimensions */}
            {vm.insights.dimensions.length > 0 && (
              <View className="rounded-xl bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-[#38383A] p-4">
                <Text className="mb-3 text-lg font-bold text-zinc-900 dark:text-[#F5F5F7]">
                  Le tue preferenze
                </Text>
                <Text className="mb-3 text-sm text-zinc-500 dark:text-neutral-500">
                  Come valutiamo la compatibilità per te
                </Text>
                {vm.insights.dimensions.map((dim) => (
                  <View key={dim.label} className="mb-2">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-sm text-zinc-700 dark:text-[#D1D1D6]">{dim.label}</Text>
                      <Text className="text-sm font-semibold text-emerald-800">
                        {dim.percentage}
                      </Text>
                    </View>
                    <View className="h-2 rounded-full bg-zinc-100 dark:bg-[#38383A]">
                      <View
                        className="h-2 rounded-full bg-emerald-600"
                        style={{ width: `${Math.round(dim.weight * 100)}%` }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Optimal times */}
            {vm.insights.optimalTimes.length > 0 && (
              <View className="rounded-xl bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-[#38383A] p-4">
                <Text className="mb-3 text-lg font-bold text-zinc-900 dark:text-[#F5F5F7]">
                  Orari migliori
                </Text>
                <Text className="mb-3 text-sm text-zinc-500 dark:text-neutral-500">
                  Quando è più probabile trovare compagni di passeggiata
                </Text>
                {vm.insights.optimalTimes.map((time) => (
                  <View
                    key={time.label}
                    className="flex-row items-center justify-between mb-2 rounded-lg bg-zinc-50 dark:bg-[#2C2C2E] px-3 py-2"
                  >
                    <Text className="text-sm font-medium text-zinc-800 dark:text-[#F5F5F7]">
                      {time.label}
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-xs text-zinc-500 dark:text-neutral-500 mr-2">
                        {time.nearbyActiveUsers} utenti attivi
                      </Text>
                      <View
                        className={`h-3 w-3 rounded-full ${(() => {
                          if (time.score > 0.7) return 'bg-emerald-500';
                          if (time.score > 0.4) return 'bg-amber-400';
                          return 'bg-zinc-300';
                        })()}`}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* A/B variant indicator (dev only) */}
            {vm.insights.variant && (
              <View className="rounded-lg bg-zinc-100 dark:bg-[#38383A] px-3 py-2">
                <Text className="text-xs text-zinc-500 dark:text-neutral-500">
                  Algoritmo: {vm.insights.variant === 'ai_enhanced' ? 'AI potenziato' : 'Standard'}
                </Text>
              </View>
            )}
          </View>
        ) : null}
        {vm.loading || vm.insights ? null : (
          <View className="items-center justify-center py-20">
            <Text className="text-zinc-500 dark:text-neutral-500">Nessun dato disponibile</Text>
            <Text className="text-sm text-zinc-400 dark:text-neutral-500 mt-1">
              Inizia a fare swipe per vedere le tue statistiche
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 min-w-[45%] rounded-lg bg-white dark:bg-[#1C1C1E] px-3 py-2">
      <Text className="text-xl font-bold text-emerald-800">{value}</Text>
      <Text className="text-xs text-zinc-500 dark:text-neutral-500">{label}</Text>
    </View>
  );
}
