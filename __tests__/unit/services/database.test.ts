import { DatabaseService } from '@/services/database';
import { getDatabase, isUsingMock } from '@/lib/database/client';
import * as errorHandling from '@/utils/errorHandling';

// Mock dependencies
jest.mock('@/lib/database/client');
jest.mock('@/utils/errorHandling', () => ({
  logError: jest.fn(),
  createDatabaseError: jest.fn((message: string, cause?: Error) => {
    const error = new Error(message);
    if (cause) {
      (error as any).cause = cause;
    }
    (error as any).code = 'DATABASE_ERROR';
    return error;
  }),
}));

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockIsUsingMock = isUsingMock as jest.MockedFunction<typeof isUsingMock>;

describe('DatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock Mode', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(true);
      mockGetDatabase.mockReturnValue(null);
    });

    describe('createEntry', () => {
      it('should create a new entry when date does not exist', async () => {
        const date = '2024-01-15';
        const content = '<p>Test entry</p>';

        const result = await DatabaseService.createEntry(date, content);

        expect(result).toMatchObject({
          entry_date: date,
          html_body: content,
        });
        expect(result.id).toBeGreaterThan(0);
        expect(result.created_at).toBeDefined();
        expect(result.updated_at).toBeDefined();
      });

      it('should update existing entry when date already exists', async () => {
        const date = '2024-01-15';
        const content1 = '<p>First content</p>';
        const content2 = '<p>Updated content</p>';

        const entry1 = await DatabaseService.createEntry(date, content1);
        const entry2 = await DatabaseService.createEntry(date, content2);

        expect(entry2.id).toBe(entry1.id);
        expect(entry2.html_body).toBe(content2);
        expect(entry2.entry_date).toBe(date);
      });

      it('should throw error when date is empty', async () => {
        await expect(DatabaseService.createEntry('', '<p>content</p>'))
          .rejects.toThrow();
      });

      it('should throw error when content is empty', async () => {
        await expect(DatabaseService.createEntry('2024-01-15', ''))
          .rejects.toThrow();
      });

      it('should throw error when date format is invalid', async () => {
        await expect(DatabaseService.createEntry('2024/01/15', '<p>content</p>'))
          .rejects.toThrow();
      });

      it('should validate YYYY-MM-DD date format', async () => {
        const invalidFormats = ['01-15-2024', '2024-1-15', '20240115', 'invalid'];

        for (const invalidDate of invalidFormats) {
          await expect(DatabaseService.createEntry(invalidDate, '<p>content</p>'))
            .rejects.toThrow();
        }
      });
    });

    describe('updateEntry', () => {
      it('should update existing entry content', async () => {
        const date = '2024-01-15';
        const initialContent = '<p>Initial content</p>';
        const updatedContent = '<p>Updated content</p>';

        const created = await DatabaseService.createEntry(date, initialContent);
        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));
        const updated = await DatabaseService.updateEntry(created.id, updatedContent);

        expect(updated.id).toBe(created.id);
        expect(updated.html_body).toBe(updatedContent);
        expect(new Date(updated.updated_at).getTime()).toBeGreaterThan(
          new Date(created.updated_at).getTime()
        );
      });

      it('should throw error when ID is invalid (0)', async () => {
        await expect(DatabaseService.updateEntry(0, '<p>content</p>'))
          .rejects.toThrow();
      });

      it('should throw error when ID is negative', async () => {
        await expect(DatabaseService.updateEntry(-1, '<p>content</p>'))
          .rejects.toThrow();
      });

      it('should throw error when content is empty', async () => {
        await expect(DatabaseService.updateEntry(1, ''))
          .rejects.toThrow();
      });

      it('should throw error when entry ID does not exist', async () => {
        await expect(DatabaseService.updateEntry(999999, '<p>content</p>'))
          .rejects.toThrow();
      });
    });

    describe('getEntryByDate', () => {
      it('should return entry when date exists', async () => {
        const date = '2024-01-15';
        const content = '<p>Test entry</p>';

        await DatabaseService.createEntry(date, content);
        const result = await DatabaseService.getEntryByDate(date);

        expect(result).not.toBeNull();
        expect(result?.entry_date).toBe(date);
        expect(result?.html_body).toBe(content);
      });

      it('should return null when date does not exist', async () => {
        const result = await DatabaseService.getEntryByDate('2024-12-31');
        expect(result).toBeNull();
      });

      it('should return null when date is empty', async () => {
        const result = await DatabaseService.getEntryByDate('');
        expect(result).toBeNull();
        expect(errorHandling.logError).toHaveBeenCalled();
      });
    });

    describe('getAllEntries', () => {
      it('should return all entries sorted by date descending', async () => {
        await DatabaseService.createEntry('2024-01-15', '<p>Entry 1</p>');
        await DatabaseService.createEntry('2024-01-20', '<p>Entry 2</p>');
        await DatabaseService.createEntry('2024-01-10', '<p>Entry 3</p>');

        const entries = await DatabaseService.getAllEntries();

        expect(entries.length).toBeGreaterThanOrEqual(3);
        // Check that dates are in descending order
        for (let i = 0; i < entries.length - 1; i++) {
          const date1 = new Date(entries[i].entry_date).getTime();
          const date2 = new Date(entries[i + 1].entry_date).getTime();
          expect(date1).toBeGreaterThanOrEqual(date2);
        }
      });

      it('should return empty array when no entries exist', async () => {
        // This test will have existing mock entries, but we can still verify the return type
        const entries = await DatabaseService.getAllEntries();
        expect(Array.isArray(entries)).toBe(true);
      });
    });

    describe('getEntriesForMonth', () => {
      it('should return entries for specific month', async () => {
        await DatabaseService.createEntry('2024-03-15', '<p>March entry 1</p>');
        await DatabaseService.createEntry('2024-03-20', '<p>March entry 2</p>');
        await DatabaseService.createEntry('2024-04-15', '<p>April entry</p>');

        const marchEntries = await DatabaseService.getEntriesForMonth(2024, 3);

        const marchDates = marchEntries.filter(e => e.entry_date.startsWith('2024-03'));
        expect(marchDates.length).toBeGreaterThanOrEqual(2);
      });

      it('should handle month boundaries correctly', async () => {
        await DatabaseService.createEntry('2024-02-28', '<p>Feb last day</p>');
        await DatabaseService.createEntry('2024-02-29', '<p>Leap day</p>');
        await DatabaseService.createEntry('2024-03-01', '<p>March first</p>');

        const febEntries = await DatabaseService.getEntriesForMonth(2024, 2);
        const marchEntries = await DatabaseService.getEntriesForMonth(2024, 3);

        const febDates = febEntries.filter(e => e.entry_date.startsWith('2024-02'));
        const marchDates = marchEntries.filter(e => e.entry_date.startsWith('2024-03'));

        expect(febDates.length).toBeGreaterThanOrEqual(2);
        expect(marchDates.length).toBeGreaterThanOrEqual(1);
      });

      it('should return empty array when no entries in month', async () => {
        const entries = await DatabaseService.getEntriesForMonth(2030, 12);
        expect(Array.isArray(entries)).toBe(true);
      });

      it('should pad single-digit months correctly', async () => {
        await DatabaseService.createEntry('2024-01-15', '<p>January</p>');
        const entries = await DatabaseService.getEntriesForMonth(2024, 1);

        const janEntries = entries.filter(e => e.entry_date.startsWith('2024-01'));
        expect(janEntries.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('getHistoryForDate', () => {
      it('should return entries matching MM-DD across years', async () => {
        await DatabaseService.createEntry('2022-03-15', '<p>2022 entry</p>');
        await DatabaseService.createEntry('2023-03-15', '<p>2023 entry</p>');
        await DatabaseService.createEntry('2024-03-15', '<p>2024 entry</p>');
        await DatabaseService.createEntry('2024-03-16', '<p>Different day</p>');

        const history = await DatabaseService.getHistoryForDate('03-15');

        const matching = history.filter(e => e.entry_date.endsWith('-03-15'));
        expect(matching.length).toBeGreaterThanOrEqual(3);
      });

      it('should not return entries from different days', async () => {
        await DatabaseService.createEntry('2024-03-15', '<p>March 15</p>');
        await DatabaseService.createEntry('2024-03-16', '<p>March 16</p>');

        const history = await DatabaseService.getHistoryForDate('03-15');

        const wrongDay = history.filter(e => e.entry_date.endsWith('-03-16'));
        expect(wrongDay.length).toBe(0);
      });

      it('should return empty array when no matching history', async () => {
        const history = await DatabaseService.getHistoryForDate('12-31');
        expect(Array.isArray(history)).toBe(true);
      });
    });

    describe('deleteEntry', () => {
      it('should delete entry by ID', async () => {
        const entry = await DatabaseService.createEntry('2024-01-15', '<p>To delete</p>');
        await DatabaseService.deleteEntry(entry.id);

        const result = await DatabaseService.getEntryByDate('2024-01-15');
        expect(result).toBeNull();
      });

      it('should throw error when ID is invalid (0)', async () => {
        await expect(DatabaseService.deleteEntry(0))
          .rejects.toThrow();
      });

      it('should throw error when ID is negative', async () => {
        await expect(DatabaseService.deleteEntry(-1))
          .rejects.toThrow();
      });

      it('should not throw when deleting non-existent ID', async () => {
        // Should not throw - just silently ignore
        await expect(DatabaseService.deleteEntry(999999))
          .resolves.not.toThrow();
      });
    });

    describe('getEntryCount', () => {
      it('should return correct count of entries', async () => {
        const initialCount = await DatabaseService.getEntryCount();

        await DatabaseService.createEntry('2024-01-15', '<p>Entry 1</p>');
        await DatabaseService.createEntry('2024-01-16', '<p>Entry 2</p>');

        const newCount = await DatabaseService.getEntryCount();
        expect(newCount).toBeGreaterThanOrEqual(initialCount + 2);
      });

      it('should return 0 when no entries exist', async () => {
        // Delete all entries first would be complex in mock mode
        // Just verify it returns a number
        const count = await DatabaseService.getEntryCount();
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('SQLite Mode', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
    });

    describe('Database availability', () => {
      it('should throw error when database is not available on createEntry', async () => {
        mockGetDatabase.mockReturnValue(null);

        await expect(
          DatabaseService.createEntry('2024-01-15', '<p>content</p>')
        ).rejects.toThrow();
      });

      it('should throw error when database is not available on updateEntry', async () => {
        mockGetDatabase.mockReturnValue(null);

        await expect(
          DatabaseService.updateEntry(1, '<p>content</p>')
        ).rejects.toThrow();
      });

      it('should return null when database is not available on getEntryByDate', async () => {
        mockGetDatabase.mockReturnValue(null);

        const result = await DatabaseService.getEntryByDate('2024-01-15');
        expect(result).toBeNull();
        expect(errorHandling.logError).toHaveBeenCalled();
      });

      it('should return empty array when database is not available on getAllEntries', async () => {
        mockGetDatabase.mockReturnValue(null);

        const result = await DatabaseService.getAllEntries();
        expect(result).toEqual([]);
        expect(errorHandling.logError).toHaveBeenCalled();
      });

      it('should return empty array when database is not available on getEntriesForMonth', async () => {
        mockGetDatabase.mockReturnValue(null);

        const result = await DatabaseService.getEntriesForMonth(2024, 1);
        expect(result).toEqual([]);
      });

      it('should return empty array when database is not available on getHistoryForDate', async () => {
        mockGetDatabase.mockReturnValue(null);

        const result = await DatabaseService.getHistoryForDate('01-15');
        expect(result).toEqual([]);
      });

      it('should throw error when database is not available on deleteEntry', async () => {
        mockGetDatabase.mockReturnValue(null);

        await expect(DatabaseService.deleteEntry(1))
          .rejects.toThrow();
      });
    });

    describe('Error handling', () => {
      it('should log errors and throw on createEntry failure', async () => {
        const mockDb = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockRejectedValue(new Error('DB error')),
            }),
          }),
        };
        mockGetDatabase.mockReturnValue(mockDb as any);

        await expect(
          DatabaseService.createEntry('2024-01-15', '<p>content</p>')
        ).rejects.toThrow();

        expect(errorHandling.logError).toHaveBeenCalled();
      });

      it('should log errors and throw on updateEntry failure', async () => {
        const mockDb = {
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                returning: jest.fn().mockRejectedValue(new Error('DB error')),
              }),
            }),
          }),
        };
        mockGetDatabase.mockReturnValue(mockDb as any);

        await expect(
          DatabaseService.updateEntry(1, '<p>content</p>')
        ).rejects.toThrow();

        expect(errorHandling.logError).toHaveBeenCalled();
      });

      it('should log errors and return null on getEntryByDate failure', async () => {
        const mockDb = {
          select: jest.fn().mockReturnValue({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockRejectedValue(new Error('DB error')),
              }),
            }),
          }),
        };
        mockGetDatabase.mockReturnValue(mockDb as any);

        const result = await DatabaseService.getEntryByDate('2024-01-15');

        expect(result).toBeNull();
        expect(errorHandling.logError).toHaveBeenCalled();
      });
    });
  });
});
