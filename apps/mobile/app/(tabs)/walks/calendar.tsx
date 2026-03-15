export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { WALK_STATUS } from '@pawmeet/types';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogSelector } from '@/components/DogSelector';
import type { ViewMode } from './calendar.view-model';
import { useCalendarViewModel } from './calendar.view-model';

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function statusColor(status: string): string {
  switch (status) {
    case WALK_STATUS.PENDING:
      return 'bg-yellow-400';
    case WALK_STATUS.ACCEPTED:
      return 'bg-green-500';
    case WALK_STATUS.COMPLETED:
      return 'bg-blue-400';
    default:
      return 'bg-gray-300';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case WALK_STATUS.PENDING:
      return 'In attesa';
    case WALK_STATUS.ACCEPTED:
      return 'Confermata';
    case WALK_STATUS.COMPLETED:
      return 'Completata';
    default:
      return status;
  }
}

function statusBadgeColor(status: string): string {
  switch (status) {
    case WALK_STATUS.PENDING:
      return 'bg-yellow-100 text-yellow-800';
    case WALK_STATUS.ACCEPTED:
      return 'bg-green-100 text-green-800';
    case WALK_STATUS.COMPLETED:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-500';
  }
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ── View mode toggle ───────────────────────────────────────────────────────

function ViewModeToggle({
  viewMode,
  onToggle,
}: {
  viewMode: ViewMode;
  onToggle: (mode: ViewMode) => void;
}) {
  return (
    <View className="flex-row rounded-lg bg-gray-100 p-0.5">
      <Pressable
        onPress={() => onToggle('week')}
        className={`rounded-md px-3 py-1.5 ${viewMode === 'week' ? 'bg-white shadow-sm' : ''}`}
      >
        <Text
          className={`text-xs font-medium ${viewMode === 'week' ? 'text-gray-900' : 'text-gray-500'}`}
        >
          Settimana
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onToggle('month')}
        className={`rounded-md px-3 py-1.5 ${viewMode === 'month' ? 'bg-white shadow-sm' : ''}`}
      >
        <Text
          className={`text-xs font-medium ${viewMode === 'month' ? 'text-gray-900' : 'text-gray-500'}`}
        >
          Mese
        </Text>
      </Pressable>
    </View>
  );
}

// ── Calendar day cell ──────────────────────────────────────────────────────

const CalendarDay = memo(function CalendarDay({
  day,
  isToday,
  isSelected,
  isCurrentMonth,
  walkCount,
  walkStatuses,
  onPress,
}: {
  day: Date;
  isToday: boolean;
  isSelected: boolean;
  isCurrentMonth: boolean;
  walkCount: number;
  walkStatuses: string[];
  onPress: () => void;
}) {
  const bgClass = isSelected ? 'bg-emerald-700' : isToday ? 'bg-emerald-100' : '';

  const textClass = isSelected
    ? 'text-white font-bold'
    : isToday
      ? 'text-emerald-800 font-bold'
      : isCurrentMonth
        ? 'text-gray-900'
        : 'text-gray-300';

  // Show up to 3 status dots — keyed by position (1-based) to satisfy noArrayIndexKey
  const dots = walkStatuses.slice(0, 3).map((status, pos) => ({ key: pos + 1, status }));

  return (
    <Pressable onPress={onPress} className={`flex-1 items-center py-2 rounded-lg ${bgClass}`}>
      <Text className={`text-sm ${textClass}`}>{day.getDate()}</Text>
      {walkCount > 0 && (
        <View className="flex-row gap-0.5 mt-1">
          {dots.map((dot) => (
            <View
              key={dot.key}
              className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : statusColor(dot.status)}`}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
});

CalendarDay.displayName = 'CalendarDay';

// ── Walk item in daily list ────────────────────────────────────────────────

const WalkItem = memo(function WalkItem({
  title,
  time,
  duration,
  location,
  status,
}: {
  title: string | null;
  time: string;
  duration: number;
  location: string | null;
  status: string;
}) {
  return (
    <View className="flex-row items-center rounded-xl bg-white p-3 shadow-sm border border-gray-100 mb-2">
      <View className={`h-10 w-1 rounded-full mr-3 ${statusColor(status)}`} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900">{title ?? 'Passeggiata'}</Text>
        <Text className="text-xs text-gray-500">
          {time} - {duration} min
        </Text>
        {location && <Text className="text-xs text-gray-400 mt-0.5">{location}</Text>}
      </View>
      <View className={`rounded-full px-2 py-1 ${statusBadgeColor(status)}`}>
        <Text className="text-xs font-medium">{statusLabel(status)}</Text>
      </View>
    </View>
  );
});

WalkItem.displayName = 'WalkItem';

// ── Loading skeleton ───────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <View className="px-4 py-6">
      <View className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-4" />
      <View className="flex-row gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <View key={n} className="flex-1 h-4 rounded bg-gray-200 animate-pulse" />
        ))}
      </View>
      {[1, 2, 3, 4, 5].map((row) => (
        <View key={row} className="flex-row gap-1 mb-1">
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <View key={col} className="flex-1 h-10 rounded bg-gray-100 animate-pulse" />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const vm = useCalendarViewModel();
  const router = useRouter();

  const isInitialLoad = vm.loading && vm.walksForSelectedDate.length === 0;

  const selectedDateLabel = vm.selectedDate.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-emerald-700 font-medium">Indietro</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900">Calendario</Text>
        <Pressable onPress={vm.goToToday}>
          <Text className="text-base text-emerald-700 font-medium">Oggi</Text>
        </Pressable>
      </View>

      {/* Dog selector for multi-dog */}
      {vm.hasMultipleDogs && <DogSelector />}

      {isInitialLoad ? (
        <CalendarSkeleton />
      ) : (
        <ScrollView className="flex-1">
          {/* Navigation + view toggle */}
          <View className="px-4 pt-4 pb-2">
            <View className="flex-row items-center justify-between mb-3">
              <Pressable onPress={vm.navigatePrev} className="p-2">
                <Text className="text-lg text-gray-600">{'\u2039'}</Text>
              </Pressable>
              <Text className="text-base font-semibold text-gray-900">{vm.headerTitle}</Text>
              <Pressable onPress={vm.navigateNext} className="p-2">
                <Text className="text-lg text-gray-600">{'\u203A'}</Text>
              </Pressable>
            </View>
            <View className="items-center mb-3">
              <ViewModeToggle viewMode={vm.viewMode} onToggle={vm.setViewMode} />
            </View>
          </View>

          {/* Weekday headers */}
          <View className="flex-row px-4 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} className="flex-1 items-center">
                <Text className="text-xs font-medium text-gray-400">{label}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View className="px-4 mb-4">
            {Array.from({ length: vm.viewMode === 'week' ? 1 : 6 }, (_, i) => i + 1).map((rowNum) => (
              <View key={rowNum} className="flex-row">
                {vm.calendarDays.slice((rowNum - 1) * 7, (rowNum - 1) * 7 + 7).map((day) => {
                  const walks = vm.getWalksForDay(day);
                  return (
                    <CalendarDay
                      key={day.toISOString()}
                      day={day}
                      isToday={vm.isSameDay(day, vm.today)}
                      isSelected={vm.isSameDay(day, vm.selectedDate)}
                      isCurrentMonth={day.getMonth() === vm.currentDate.getMonth()}
                      walkCount={walks.length}
                      walkStatuses={walks.map((w) => w.status)}
                      onPress={() => vm.setSelectedDate(day)}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {/* Selected day walks */}
          <View className="px-4 pb-6">
            <Text className="text-sm font-semibold text-gray-900 mb-3 capitalize">
              {selectedDateLabel}
            </Text>
            {vm.walksForSelectedDate.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-400 text-sm">Nessuna passeggiata</Text>
              </View>
            ) : (
              vm.walksForSelectedDate.map((walk) => (
                <WalkItem
                  key={walk.id}
                  title={walk.title}
                  time={formatTime(walk.scheduledAt)}
                  duration={walk.durationMin}
                  location={walk.location}
                  status={walk.status}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
