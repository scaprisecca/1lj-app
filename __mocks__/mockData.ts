import type { JournalEntry } from '@/lib/database/schema';

/**
 * Mock journal entry for testing
 */
export const mockJournalEntry: JournalEntry = {
  id: 1,
  entry_date: '2024-01-15',
  html_body: '<p>Sample journal entry for testing</p>',
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
};

/**
 * Multiple mock journal entries for testing list operations
 */
export const mockJournalEntries: JournalEntry[] = [
  {
    id: 1,
    entry_date: '2024-01-15',
    html_body: '<p>Entry from January 15th</p>',
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    entry_date: '2024-01-14',
    html_body: '<p>Entry from January 14th with <strong>bold text</strong></p>',
    created_at: '2024-01-14T10:00:00.000Z',
    updated_at: '2024-01-14T10:00:00.000Z',
  },
  {
    id: 3,
    entry_date: '2024-01-13',
    html_body: '<p>Entry from January 13th with <em>italic</em> and lists:</p><ul><li>Item 1</li><li>Item 2</li></ul>',
    created_at: '2024-01-13T10:00:00.000Z',
    updated_at: '2024-01-13T10:00:00.000Z',
  },
  {
    id: 4,
    entry_date: '2023-01-15',
    html_body: '<p>Entry from last year on the same day (for history testing)</p>',
    created_at: '2023-01-15T10:00:00.000Z',
    updated_at: '2023-01-15T10:00:00.000Z',
  },
];

/**
 * Factory function to create a mock journal entry with custom properties
 */
export const createMockEntry = (overrides: Partial<JournalEntry> = {}): JournalEntry => ({
  ...mockJournalEntry,
  ...overrides,
});

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get a date N days ago in YYYY-MM-DD format
 */
export const getDaysAgoDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

/**
 * Mock widget data
 */
export const mockWidgetData = {
  date: '2024-01-15',
  htmlContent: '<p>Test entry content</p>',
  plainTextPreview: 'Test entry content',
  lastUpdate: '2024-01-15T10:00:00.000Z',
};

/**
 * Mock backup metadata
 */
export const mockBackupLog = {
  id: 1,
  file_uri: 'file://mock-backup.json',
  run_type: 'manual' as const,
  run_time: '2024-01-15T10:00:00.000Z',
  size_bytes: 1024,
  status: 'success' as const,
};
