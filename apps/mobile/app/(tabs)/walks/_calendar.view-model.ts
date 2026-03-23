import { WALK_STATUS } from '@pawmeet/types';
import {
  addDays,
  dateKey,
  getMonthDays,
  getWeekDays,
  isSameDay,
  monthHeaderTitle,
  startOfWeek,
  weekHeaderTitle,
} from '@pawmeet/utils';
import { useCallback, useMemo, useState } from 'react';
import { useWalks } from '@/hooks/useWalks';
import { useDogsStore } from '@/stores/dogs';
import type { Walk } from './_index.view-model';

export type ViewMode = 'week' | 'month';

export function useCalendarViewModel() {
  const { upcomingWalks, loading, fetchUpcoming } = useWalks();
  const dogs = useDogsStore((s) => s.dogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Build a map: dateKey → walks[] (excluding cancelled/declined)
  const walksByDate = useMemo(() => {
    const map = new Map<string, Walk[]>();
    for (const walk of upcomingWalks) {
      if (walk.status === WALK_STATUS.CANCELLED || walk.status === WALK_STATUS.DECLINED) continue;
      const d = new Date(walk.scheduledAt);
      const key = dateKey(d);
      const existing = map.get(key) ?? [];
      existing.push(walk);
      map.set(key, existing);
    }
    return map;
  }, [upcomingWalks]);

  const calendarDays = useMemo(() => {
    if (viewMode === 'week') {
      return getWeekDays(startOfWeek(currentDate));
    }
    return getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  }, [viewMode, currentDate]);

  const walksForSelectedDate = useMemo(() => {
    return walksByDate.get(dateKey(selectedDate)) ?? [];
  }, [selectedDate, walksByDate]);

  const getWalksForDay = useCallback(
    (day: Date): Walk[] => {
      return walksByDate.get(dateKey(day)) ?? [];
    },
    [walksByDate],
  );

  const navigatePrev = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'week') return addDays(prev, -7);
      return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
    });
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === 'week') return addDays(prev, 7);
      return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
    });
  }, [viewMode]);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  }, []);

  const headerTitle = useMemo(() => {
    return viewMode === 'week' ? weekHeaderTitle(currentDate) : monthHeaderTitle(currentDate);
  }, [viewMode, currentDate]);

  const hasMultipleDogs = dogs.length > 1;
  const selectedDogName = dogs.find((d) => d.id === selectedDogId)?.name ?? null;

  return {
    viewMode,
    setViewMode,
    currentDate,
    selectedDate,
    setSelectedDate,
    calendarDays,
    walksForSelectedDate,
    getWalksForDay,
    navigatePrev,
    navigateNext,
    goToToday,
    headerTitle,
    today,
    isSameDay,
    loading,
    fetchUpcoming,
    hasMultipleDogs,
    selectedDogName,
  };
}
