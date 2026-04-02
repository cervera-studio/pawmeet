export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import { WALK_STATUS } from '@pawmeet/types';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogSelector } from '@/components/DogSelector';
import i18n, { getDateLocale } from '@/lib/i18n';
import type { ViewMode } from './_vm/calendar.view-model';
import { useCalendarViewModel } from './_vm/calendar.view-model';

const WEEKDAY_LABELS_FALLBACK = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

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
      return i18n.t('walks.status.pending');
    case WALK_STATUS.ACCEPTED:
      return i18n.t('walks.status.accepted');
    case WALK_STATUS.COMPLETED:
      return i18n.t('walks.status.completed');
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
  return d.toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' });
}

// ── View mode toggle ───────────────────────────────────────────────────────

function ViewModeToggle({
  viewMode,
  onToggle,
}: {
  viewMode: ViewMode;
  onToggle: (mode: ViewMode) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row rounded-lg bg-gray-100 dark:bg-[#38383A] p-0.5">
      <Pressable
        onPress={() => onToggle('week')}
        className={`rounded-md px-3 py-1.5 ${viewMode === 'week' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm' : ''}`}
      >
        <Text
          className={`text-xs font-medium ${viewMode === 'week' ? 'text-gray-900 dark:text-[#F5F5F7]' : 'text-gray-500 dark:text-neutral-500'}`}
        >
          {t('walks.viewMode.week')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onToggle('month')}
        className={`rounded-md px-3 py-1.5 ${viewMode === 'month' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm' : ''}`}
      >
        <Text
          className={`text-xs font-medium ${viewMode === 'month' ? 'text-gray-900 dark:text-[#F5F5F7]' : 'text-gray-500 dark:text-neutral-500'}`}
        >
          {t('walks.viewMode.month')}
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
  const bgClass = (() => {
    if (isSelected) return 'bg-emerald-700';
    if (isToday) return 'bg-emerald-100';
    return '';
  })();

  const textClass = (() => {
    if (isSelected) return 'text-white font-bold';
    if (isToday) return 'text-emerald-800 font-bold';
    if (isCurrentMonth) return 'text-gray-900 dark:text-[#F5F5F7]';
    return 'text-gray-300 dark:text-[#48484A]';
  })();

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
    <View className="flex-row items-center rounded-xl bg-white dark:bg-[#1C1C1E] p-3 shadow-sm border border-gray-100 dark:border-[#38383A] mb-2">
      <View className={`h-10 w-1 rounded-full mr-3 ${statusColor(status)}`} />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7]">
          {title ?? i18n.t('walks.defaultTitle')}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-neutral-500">
          {time} - {duration} min
        </Text>
        {location && (
          <Text className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">{location}</Text>
        )}
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
      <View className="h-8 w-48 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse mb-4" />
      <View className="flex-row gap-1 mb-2">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <View
            key={n}
            className="flex-1 h-4 rounded bg-gray-200 dark:bg-[#48484A] animate-pulse"
          />
        ))}
      </View>
      {[1, 2, 3, 4, 5].map((row) => (
        <View key={row} className="flex-row gap-1 mb-1">
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <View
              key={col}
              className="flex-1 h-10 rounded bg-gray-100 dark:bg-[#38383A] animate-pulse"
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { t } = useTranslation();
  const vm = useCalendarViewModel();
  const router = useRouter();

  const isInitialLoad = vm.loading && vm.walksForSelectedDate.length === 0;

  const selectedDateLabel = vm.selectedDate.toLocaleDateString(getDateLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#2C2C2E]">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] px-4 py-3">
        <Pressable onPress={() => router.back()}>
          <Text className="text-base text-emerald-700 font-medium">{t('common.back')}</Text>
        </Pressable>
        <Text className="text-lg font-bold text-gray-900 dark:text-[#F5F5F7]">
          {t('walks.calendar.title')}
        </Text>
        <Pressable onPress={vm.goToToday}>
          <Text className="text-base text-emerald-700 font-medium">
            {t('walks.calendar.today')}
          </Text>
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
                <Text className="text-lg text-gray-600 dark:text-[#D1D1D6]">{'\u2039'}</Text>
              </Pressable>
              <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
                {vm.headerTitle}
              </Text>
              <Pressable onPress={vm.navigateNext} className="p-2">
                <Text className="text-lg text-gray-600 dark:text-[#D1D1D6]">{'\u203A'}</Text>
              </Pressable>
            </View>
            <View className="items-center mb-3">
              <ViewModeToggle viewMode={vm.viewMode} onToggle={vm.setViewMode} />
            </View>
          </View>

          {/* Weekday headers */}
          <View className="flex-row px-4 mb-1">
            {(
              (t('walks.calendar.weekdaysShort', { returnObjects: true }) as string[]) ??
              WEEKDAY_LABELS_FALLBACK
            ).map((label) => (
              <View key={label} className="flex-1 items-center">
                <Text className="text-xs font-medium text-gray-400 dark:text-neutral-500">
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View className="px-4 mb-4">
            {Array.from({ length: vm.viewMode === 'week' ? 1 : 6 }, (_, i) => i + 1).map(
              (rowNum) => (
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
              ),
            )}
          </View>

          {/* Selected day walks */}
          <View className="px-4 pb-6">
            <Text className="text-sm font-semibold text-gray-900 dark:text-[#F5F5F7] mb-3 capitalize">
              {selectedDateLabel}
            </Text>
            {vm.walksForSelectedDate.length === 0 ? (
              <View className="items-center py-8">
                <Text className="text-gray-400 dark:text-neutral-500 text-sm">
                  {t('walks.calendar.empty')}
                </Text>
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
