import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { container } from '@/repositories/container';
import type { FeaturedEvent } from '@/repositories/interfaces';
import { GROUP_EVENT_REPOSITORY } from '@/repositories/tokens';

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

interface DayGroup {
  dateKey: string;
  label: string;
  events: FeaturedEvent[];
}

function groupByDay(events: FeaturedEvent[]): DayGroup[] {
  const map = new Map<string, { label: string; events: FeaturedEvent[] }>();

  for (const event of events) {
    const d = new Date(event.scheduledAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!map.has(key)) {
      map.set(key, { label: formatDayLabel(d), events: [] });
    }
    map.get(key)?.events.push(event);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { label, events }]) => ({ dateKey, label, events }));
}

export default function EventCalendarScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const repo = useMemo(() => container.resolve(GROUP_EVENT_REPOSITORY), []);
  const [allEvents, setAllEvents] = useState<FeaturedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const result = await repo.listFeatured(1, 50);
      setAllEvents(result);
    } catch {
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const eventsInMonth = useMemo(() => {
    return allEvents.filter((e) => {
      const d = new Date(e.scheduledAt);
      return (
        d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth()
      );
    });
  }, [allEvents, currentMonth]);

  const dayGroups = useMemo(() => groupByDay(eventsInMonth), [eventsInMonth]);

  const prevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('events.calendar.title'),
          headerBackTitle: t('events.calendar.backButton'),
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
        {/* Month navigator */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white dark:bg-[#1C1C1E] border-b border-gray-100 dark:border-[#38383A]">
          <Pressable onPress={prevMonth} className="px-3 py-2">
            <Text className="text-lg text-primary">{'<'}</Text>
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7] capitalize">
            {formatMonthYear(currentMonth)}
          </Text>
          <Pressable onPress={nextMonth} className="px-3 py-2">
            <Text className="text-lg text-primary">{'>'}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#065F46" />
          </View>
        ) : null}
        {!loading && dayGroups.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl">{'📅'}</Text>
            <Text className="mt-4 text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {t('events.calendar.noOfficialEvents')}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-neutral-500">
              in {formatMonthYear(currentMonth)}
            </Text>
          </View>
        ) : null}
        {!loading && dayGroups.length > 0 ? (
          <FlatList
            data={dayGroups}
            keyExtractor={(item) => item.dateKey}
            contentContainerClassName="px-4 py-3"
            renderItem={({ item }) => (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-500 dark:text-neutral-500 mb-2 capitalize">
                  {item.label}
                </Text>
                {item.events.map((event) => (
                  <Pressable
                    key={event.id}
                    onPress={() => router.push(`/(tabs)/events/${event.id}`)}
                    className="mb-2 rounded-xl bg-white dark:bg-[#1C1C1E] p-3 shadow-sm border border-gray-100 dark:border-[#38383A]"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 mr-2">
                        <Text
                          className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]"
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        <Text className="text-sm text-gray-500 dark:text-neutral-500 mt-0.5">
                          {formatTime(event.scheduledAt)} — {event.location}
                        </Text>
                      </View>
                      <View className="rounded-full bg-amber-500 px-2 py-0.5">
                        <Text className="text-xs font-bold text-white">Ufficiale</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          />
        ) : null}
      </SafeAreaView>
    </>
  );
}
