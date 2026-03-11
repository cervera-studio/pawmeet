const numberFormatter = new Intl.NumberFormat('it-IT');
const dateShortFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
});
const dateFullFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const dateTimeFormatter = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Format a number with Italian locale (e.g. 1.234) */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Short date: "11 mar" */
export function formatDateShort(value: string | Date): string {
  return dateShortFormatter.format(new Date(value));
}

/** Full date: "11 marzo 2026" */
export function formatDate(value: string | Date): string {
  return dateFullFormatter.format(new Date(value));
}

/** Date + time: "11 mar 2026, 14:30" */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}

/** Chart axis: "11/3" */
export function formatDateAxis(value: string): string {
  const d = new Date(value);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
