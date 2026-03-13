/** Returns today's date as "YYYY-MM-DD" in the device's local timezone. */
export function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
