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

/** Formats a "YYYY-MM-DD" string as a relative label ("Today", "Yesterday", "3 days ago", "1 week ago", ...). */
export function formatRelativeDate(dateStr: string, today: string = getTodayString()): string {
  const diffDays = Math.floor(
    (parseDateString(today).getTime() - parseDateString(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const weeks = Math.floor(diffDays / 7);
  if (diffDays < 30) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;

  const months = Math.floor(diffDays / 30);
  if (diffDays < 365) return months === 1 ? '1 month ago' : `${months} months ago`;

  const years = Math.floor(diffDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
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
