function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Returns today's date as "YYYY-MM-DD" in the device's local timezone. */
export function getTodayString(): string {
  return toDateString(new Date());
}

/** Parses a "YYYY-MM-DD" string as a local Date (avoids UTC-shift bug). */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Formats a "YYYY-MM-DD" string for display using local timezone. */
export function formatDateString(
  dateStr: string,
  options: Intl.DateTimeFormatOptions
): string {
  return parseDateString(dateStr).toLocaleDateString('en-US', options);
}

/**
 * Counts consecutive calendar days with an entry, walking back from today.
 * If there's no entry for today yet, counting starts from yesterday so a
 * still-unwritten "today" doesn't zero out an otherwise-active streak.
 */
export function calculateStreak(dates: string[], today: string): number {
  const dateSet = new Set(dates);
  const cursor = parseDateString(today);

  if (!dateSet.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (dateSet.has(toDateString(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
