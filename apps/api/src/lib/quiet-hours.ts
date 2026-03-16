/**
 * Check if the current time falls within a user's quiet hours.
 * Returns true if notifications should be suppressed.
 */
export function isInQuietHours(
  prefs: {
    quietHoursStart?: string | null;
    quietHoursEnd?: string | null;
    timezone?: string | null;
  } | null,
): boolean {
  if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;

  const tz = prefs.timezone || 'Europe/Rome';

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
    const nowMinutes = hour * 60 + minute;

    const startParts = prefs.quietHoursStart.split(':').map(Number);
    const endParts = prefs.quietHoursEnd.split(':').map(Number);
    const startMinutes = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0);
    const endMinutes = (endParts[0] ?? 0) * 60 + (endParts[1] ?? 0);

    // Handle overnight ranges (e.g., 22:00 - 07:00)
    if (startMinutes <= endMinutes) {
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    }
    return nowMinutes >= startMinutes || nowMinutes < endMinutes;
  } catch {
    return false;
  }
}
