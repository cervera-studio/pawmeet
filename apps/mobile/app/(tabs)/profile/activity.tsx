import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useHealthConnect } from '@/hooks/useHealthConnect';
import { useActivityViewModel } from './activity.view-model';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Skeleton ---

function ActivitySkeleton() {
  return (
    <View className="px-4 py-4">
      {/* Period toggle skeleton */}
      <View className="mb-4 h-10 rounded-xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />

      {/* Dog selector skeleton */}
      <View className="mb-4 flex-row gap-2">
        <View className="h-9 w-24 rounded-full bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
        <View className="h-9 w-24 rounded-full bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      </View>

      {/* Stat cards skeleton */}
      <View className="mb-4 flex-row gap-3">
        <View className="flex-1 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
        <View className="flex-1 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      </View>
      <View className="mb-4 flex-row gap-3">
        <View className="flex-1 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
        <View className="flex-1 h-20 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
      </View>

      {/* Averages skeleton */}
      <View className="mb-4 h-24 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />

      {/* Bar chart skeleton */}
      <View className="mb-4 h-40 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />

      {/* Goal skeleton */}
      <View className="mb-4 h-32 rounded-2xl bg-neutral-200 dark:bg-[#48484A] animate-pulse" />
    </View>
  );
}

// --- Stat Card ---

function StatCard({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View className="flex-1 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <View className="flex-row items-baseline gap-1">
        <Text className="text-2xl font-bold text-neutral-900 dark:text-[#F5F5F7]">{value}</Text>
        <Text className="text-sm text-neutral-500 dark:text-neutral-500">{unit}</Text>
      </View>
      <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">{label}</Text>
    </View>
  );
}

// --- Bar Chart ---

const WEEK_LABELS = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const BAR_HEIGHT = 120;
const BAR_WIDTH_WEEK = 32;
const BAR_GAP_WEEK = 8;
const BAR_WIDTH_MONTH = 8;
const BAR_GAP_MONTH = 3;

function BarChart({
  days,
  period,
}: {
  days: { date: string; walkDistanceKm: number; walkDurationMin: number }[];
  period: 'week' | 'month';
}) {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const maxKm = Math.max(...days.map((d) => d.walkDistanceKm), 0.1);
  const isWeek = period === 'week';
  const barWidth = isWeek ? BAR_WIDTH_WEEK : BAR_WIDTH_MONTH;
  const barGap = isWeek ? BAR_GAP_WEEK : BAR_GAP_MONTH;
  const today = new Date().toISOString().slice(0, 10);

  const handleBarPress = useCallback((index: number) => {
    setTooltipIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <Text className="mb-3 text-base font-semibold text-neutral-900 dark:text-[#F5F5F7]">
        Dettaglio giornaliero
      </Text>
      <View className="flex-row items-end justify-center" style={{ height: BAR_HEIGHT }}>
        {days.map((day, i) => {
          const ratio = day.walkDistanceKm / maxKm;
          const barH = Math.max(ratio * (BAR_HEIGHT - 20), 4);
          const isToday = day.date === today;

          return (
            <View key={day.date} className="items-center" style={{ marginHorizontal: barGap / 2 }}>
              {tooltipIndex === i ? (
                <View className="absolute -top-10 rounded-lg bg-neutral-900 px-2 py-1">
                  <Text className="text-xs text-white">
                    {day.walkDistanceKm.toFixed(1)} km · {day.walkDurationMin} min
                  </Text>
                </View>
              ) : null}
              <Pressable onPress={() => handleBarPress(i)}>
                <View
                  className={`rounded-t-lg ${isToday ? 'bg-primary' : 'bg-primary-200'}`}
                  style={{ width: barWidth, height: barH }}
                />
              </Pressable>
              {isWeek ? (
                <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                  {WEEK_LABELS[i % 7]}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// --- Progress Ring ---

const RING_SIZE = 100;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({
  progress,
  currentMin,
  targetMin,
  sizeCategory,
}: {
  progress: number;
  currentMin: number;
  targetMin: number;
  sizeCategory: string;
}) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const animatedProgress = useSharedValue(0);

  // Trigger animation
  useState(() => {
    animatedProgress.value = withSpring(clamped, { damping: 15, stiffness: 80 });
  });

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  return (
    <View className="items-center">
      <View style={{ width: RING_SIZE, height: RING_SIZE }}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Background ring */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="#E5E5EA"
            strokeWidth={RING_STROKE}
            fill="none"
          />
          {/* Progress arc */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="#065F46"
            strokeWidth={RING_STROKE}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            animatedProps={animatedProps}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-sm font-bold text-neutral-900 dark:text-[#F5F5F7]">
            {Math.round(currentMin)} / {targetMin}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-500">min</Text>
        </View>
      </View>
      <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
        Taglia: {sizeCategory}
      </Text>
    </View>
  );
}

// --- Health Connect Card ---

function HealthConnectCard() {
  const { isAvailable, isConnected, loading, connect, disconnect, syncNow, lastSyncDate } =
    useHealthConnect();

  if (!(isAvailable || isConnected)) return null;

  const title = Platform.OS === 'ios' ? 'Connetti Apple Salute' : 'Connetti Health Connect';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View className="mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
      <Text className="mb-1 text-base font-semibold text-neutral-900 dark:text-[#F5F5F7]">
        {title}
      </Text>
      <Text className="mb-3 text-sm text-neutral-500 dark:text-neutral-500">
        Sincronizza passi e distanza automaticamente
      </Text>

      {isConnected ? (
        <>
          {lastSyncDate ? (
            <Text className="mb-3 text-xs text-neutral-500 dark:text-neutral-500">
              Ultima sincronizzazione: {formatDate(lastSyncDate)}
            </Text>
          ) : null}

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => void syncNow()}
              disabled={loading}
              className={`flex-1 items-center rounded-xl py-2.5 ${
                loading ? 'bg-primary-200' : 'bg-primary'
              }`}
            >
              <Text className="font-medium text-white">
                {loading ? 'Sincronizzazione...' : 'Sincronizza ora'}
              </Text>
            </Pressable>

            <Pressable
              onPress={disconnect}
              className="items-center rounded-xl border border-neutral-300 dark:border-neutral-600 px-4 py-2.5"
            >
              <Text className="font-medium text-neutral-700 dark:text-[#D1D1D6]">Scollega</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable
          onPress={() => void connect()}
          disabled={loading}
          className={`items-center rounded-xl py-2.5 ${loading ? 'bg-primary-200' : 'bg-primary'}`}
        >
          <Text className="font-medium text-white">{loading ? 'Connessione...' : 'Connetti'}</Text>
        </Pressable>
      )}
    </View>
  );
}

// --- Main Screen ---

export default function ActivityScreen() {
  const vm = useActivityViewModel();

  return (
    <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-[#2C2C2E]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Attività',
          headerBackTitle: 'Profilo',
        }}
      />

      {vm.loading && !vm.stats ? (
        <ActivitySkeleton />
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
          {/* Period toggle */}
          <View className="mb-4 flex-row rounded-xl bg-white dark:bg-[#1C1C1E] p-1 shadow-sm">
            <Pressable
              onPress={() => vm.changePeriod('week')}
              className={`flex-1 items-center rounded-lg py-2 ${
                vm.period === 'week' ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`font-medium ${vm.period === 'week' ? 'text-white' : 'text-neutral-700 dark:text-[#D1D1D6]'}`}
              >
                Settimana
              </Text>
            </Pressable>
            <Pressable
              onPress={() => vm.changePeriod('month')}
              className={`flex-1 items-center rounded-lg py-2 ${
                vm.period === 'month' ? 'bg-primary' : ''
              }`}
            >
              <Text
                className={`font-medium ${vm.period === 'month' ? 'text-white' : 'text-neutral-700 dark:text-[#D1D1D6]'}`}
              >
                Mese
              </Text>
            </Pressable>
          </View>

          {/* Dog selector — above data */}
          {vm.dogs.length > 1 ? (
            <View className="mb-4">
              <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-[#D1D1D6]">
                Seleziona cane
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {vm.dogs.map((dog) => (
                  <Pressable
                    key={dog.id}
                    onPress={() => vm.selectDog(dog.id)}
                    className={`mr-2 rounded-full px-4 py-2 ${
                      vm.selectedDogId === dog.id ? 'bg-primary' : 'bg-white dark:bg-[#1C1C1E]'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        vm.selectedDogId === dog.id
                          ? 'text-white'
                          : 'text-neutral-700 dark:text-[#D1D1D6]'
                      }`}
                    >
                      {dog.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

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
              <View className="mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
                <Text className="mb-3 text-base font-semibold text-neutral-900 dark:text-[#F5F5F7]">
                  Medie giornaliere
                </Text>
                <View className="flex-row justify-around">
                  <View className="items-center">
                    <Text className="text-xl font-bold text-primary">
                      {vm.stats.summary.avgDailyDistanceKm.toFixed(1)}
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-500">
                      km/giorno
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xl font-bold text-primary">
                      {Math.round(vm.stats.summary.avgDailyDurationMin)}
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-500">
                      min/giorno
                    </Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-xl font-bold text-primary">
                      {Math.round(vm.stats.summary.avgDailySteps)}
                    </Text>
                    <Text className="text-xs text-neutral-500 dark:text-neutral-500">
                      passi/giorno
                    </Text>
                  </View>
                </View>
              </View>

              {/* Bar chart (replaces daily breakdown table) */}
              {vm.stats.summary.days.length > 0 ? (
                <BarChart days={vm.stats.summary.days} period={vm.period} />
              ) : null}
            </>
          ) : null}

          {/* Health goal — progress ring */}
          {vm.healthGoal ? (
            <View className="mb-4 rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm">
              <Text className="mb-3 text-base font-semibold text-neutral-900 dark:text-[#F5F5F7]">
                Obiettivo giornaliero
              </Text>
              <ProgressRing
                progress={vm.healthGoal.goal.goalProgress}
                currentMin={vm.healthGoal.goal.currentDailyAvgMinutes}
                targetMin={vm.healthGoal.goal.recommendedDailyMinutes}
                sizeCategory={vm.healthGoal.goal.sizeCategory}
              />
            </View>
          ) : null}

          {/* Health Connect / Apple HealthKit integration */}
          <HealthConnectCard />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
