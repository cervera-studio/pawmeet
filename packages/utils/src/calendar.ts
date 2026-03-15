/** Calendar utility functions for week/month grid generation. */

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday-based week
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  // Pad from Monday
  const padStart = startDay === 0 ? 6 : startDay - 1;
  const start = addDays(first, -padStart);

  // Always 6 weeks (42 days) for consistent layout
  for (let i = 0; i < 42; i++) {
    days.push(addDays(start, i));
  }
  return days;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Build a date key for map lookups. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Group items by date using scheduledAt field. */
export function groupByDate<T extends { scheduledAt: Date | string }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const d = new Date(item.scheduledAt);
    const key = dateKey(d);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
  }
  return map;
}

const MONTH_NAMES_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const MONTH_ABBR_IT = MONTH_NAMES_IT.map((m) => m.slice(0, 3));

export function monthHeaderTitle(date: Date): string {
  return `${MONTH_NAMES_IT[date.getMonth()]} ${date.getFullYear()}`;
}

export function weekHeaderTitle(date: Date): string {
  const ws = startOfWeek(date);
  const we = addDays(ws, 6);
  if (ws.getMonth() === we.getMonth()) {
    return `${ws.getDate()}-${we.getDate()} ${MONTH_NAMES_IT[ws.getMonth()]} ${ws.getFullYear()}`;
  }
  return `${ws.getDate()} ${MONTH_ABBR_IT[ws.getMonth()]} - ${we.getDate()} ${MONTH_ABBR_IT[we.getMonth()]} ${we.getFullYear()}`;
}
