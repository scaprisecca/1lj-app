import { WidgetService } from '@/services/widget';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '@/services/database';
import WidgetManager, { isWidgetManagerEnabled } from '@/modules/widget-manager';
import * as errorHandling from '@/utils/errorHandling';
import type { JournalEntry } from '@/lib/database/schema';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@/services/database');
jest.mock('@/modules/widget-manager');
jest.mock('@/utils/errorHandling', () => ({
  logError: jest.fn(),
  createWidgetError: jest.fn((message: string, cause?: Error) => {
    const error = new Error(message);
    if (cause) {
      (error as any).cause = cause;
    }
    (error as any).code = 'WIDGET_ERROR';
    return error;
  }),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
const mockWidgetManager = WidgetManager as jest.Mocked<typeof WidgetManager>;
const mockIsWidgetManagerEnabled = isWidgetManagerEnabled as jest.MockedFunction<typeof isWidgetManagerEnabled>;

describe('WidgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: widget manager is enabled
    mockIsWidgetManagerEnabled.mockReturnValue(true);
  });

  describe('htmlToPlainText', () => {
    it('should convert br tags to newlines', () => {
      const html = 'Line 1<br>Line 2<br/>Line 3';
      const result = WidgetService.htmlToPlainText(html);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should convert closing p tags to newlines', () => {
      const html = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      const result = WidgetService.htmlToPlainText(html);
      expect(result).toBe('Paragraph 1\nParagraph 2');
    });

    it('should remove all HTML tags', () => {
      const html = '<div><strong>Bold</strong> and <em>italic</em> text</div>';
      const result = WidgetService.htmlToPlainText(html);
      expect(result).toBe('Bold and italic text');
    });

    it('should decode HTML entities', () => {
      const html = 'Test&nbsp;&amp;&nbsp;&lt;&gt;&quot;';
      const result = WidgetService.htmlToPlainText(html);
      expect(result).toBe('Test & <>"');
    });

    it('should trim whitespace from result', () => {
      const html = '   <p>Text with spaces</p>   ';
      const result = WidgetService.htmlToPlainText(html);
      expect(result).toBe('Text with spaces');
    });

    it('should handle empty string', () => {
      const result = WidgetService.htmlToPlainText('');
      expect(result).toBe('');
    });

    it('should handle complex HTML', () => {
      const html = '<p>First line</p><p><strong>Bold</strong> text &amp; <em>italic</em></p><p>Last&nbsp;line</p>';
      const result = WidgetService.htmlToPlainText(html);
      expect(result).toContain('First line');
      expect(result).toContain('Bold text & italic');
      expect(result).toContain('Last line');
    });
  });

  describe('truncateText', () => {
    it('should return original text when shorter than max length', () => {
      const text = 'Short text';
      const result = WidgetService.truncateText(text, 50);
      expect(result).toBe('Short text');
    });

    it('should truncate text when longer than max length', () => {
      const text = 'This is a very long text that should be truncated';
      const result = WidgetService.truncateText(text, 20);
      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should use default max length of 80', () => {
      const text = 'a'.repeat(100);
      const result = WidgetService.truncateText(text);
      expect(result.length).toBe(80);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should handle text exactly at max length', () => {
      const text = 'a'.repeat(80);
      const result = WidgetService.truncateText(text, 80);
      expect(result).toBe(text);
      expect(result.length).toBe(80);
    });

    it('should handle empty string', () => {
      const result = WidgetService.truncateText('', 10);
      expect(result).toBe('');
    });
  });

  describe('updateWidgetData', () => {
    const mockEntry: JournalEntry = {
      id: 1,
      entry_date: '2024-01-15',
      html_body: '<p>Test entry content</p>',
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
    };

    beforeEach(() => {
      mockAsyncStorage.setItem.mockResolvedValue();
      mockWidgetManager.reloadWidgets.mockResolvedValue();
    });

    it('should update widget data with existing entry', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);

      await WidgetService.updateWidgetData();

      expect(mockDatabaseService.getEntryByDate).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@widget_today_entry',
        expect.stringContaining('"htmlContent":"<p>Test entry content</p>"')
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@widget_last_update',
        expect.any(String)
      );
    });

    it('should update widget data when no entry exists', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(null);

      await WidgetService.updateWidgetData();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@widget_today_entry',
        expect.stringContaining('"plainTextPreview":"No entry for today"')
      );
    });

    it('should reload widgets when widget manager is enabled', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);
      mockIsWidgetManagerEnabled.mockReturnValue(true);

      await WidgetService.updateWidgetData();

      expect(mockWidgetManager.reloadWidgets).toHaveBeenCalled();
    });

    it('should not reload widgets when widget manager is disabled', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);
      mockIsWidgetManagerEnabled.mockReturnValue(false);

      await WidgetService.updateWidgetData();

      expect(mockWidgetManager.reloadWidgets).not.toHaveBeenCalled();
    });

    it('should handle widget reload errors gracefully', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);
      mockIsWidgetManagerEnabled.mockReturnValue(true);
      mockWidgetManager.reloadWidgets.mockRejectedValue(new Error('Widget reload failed'));

      // Should not throw
      await expect(WidgetService.updateWidgetData()).resolves.not.toThrow();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should throw error when database retrieval fails', async () => {
      mockDatabaseService.getEntryByDate.mockRejectedValue(new Error('DB error'));

      await expect(WidgetService.updateWidgetData()).rejects.toThrow();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should include plain text preview in widget data', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);

      await WidgetService.updateWidgetData();

      const setItemCall = mockAsyncStorage.setItem.mock.calls.find(
        call => call[0] === '@widget_today_entry'
      );
      const widgetData = JSON.parse(setItemCall![1]);

      expect(widgetData.plainTextPreview).toBe('Test entry content');
    });
  });

  describe('getWidgetData', () => {
    it('should return widget data when valid data exists', async () => {
      const mockData = {
        date: '2024-01-15',
        htmlContent: '<p>Test</p>',
        plainTextPreview: 'Test',
        lastUpdate: '2024-01-15T10:00:00.000Z',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockData));

      const result = await WidgetService.getWidgetData();

      expect(result).toEqual(mockData);
    });

    it('should return null when no data exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await WidgetService.getWidgetData();

      expect(result).toBeNull();
    });

    it('should return null and log error on invalid JSON', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const result = await WidgetService.getWidgetData();

      expect(result).toBeNull();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should return null when data structure is invalid (missing date)', async () => {
      const invalidData = {
        htmlContent: '<p>Test</p>',
        lastUpdate: '2024-01-15T10:00:00.000Z',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidData));

      const result = await WidgetService.getWidgetData();

      expect(result).toBeNull();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should return null when data structure is invalid (missing lastUpdate)', async () => {
      const invalidData = {
        date: '2024-01-15',
        htmlContent: '<p>Test</p>',
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(invalidData));

      const result = await WidgetService.getWidgetData();

      expect(result).toBeNull();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await WidgetService.getWidgetData();

      expect(result).toBeNull();
      expect(errorHandling.logError).toHaveBeenCalled();
    });
  });

  describe('appendToToday', () => {
    const mockEntry: JournalEntry = {
      id: 1,
      entry_date: '2024-01-15',
      html_body: '<p>Existing content</p>',
      created_at: '2024-01-15T10:00:00.000Z',
      updated_at: '2024-01-15T10:00:00.000Z',
    };

    beforeEach(() => {
      mockAsyncStorage.setItem.mockResolvedValue();
      mockWidgetManager.reloadWidgets.mockResolvedValue();
    });

    it('should throw error when text is empty', async () => {
      await expect(WidgetService.appendToToday('')).rejects.toThrow();
      await expect(WidgetService.appendToToday('   ')).rejects.toThrow();
    });

    it('should append to existing entry', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);
      mockDatabaseService.updateEntry.mockResolvedValue({
        ...mockEntry,
        html_body: mockEntry.html_body + '<p><strong>12:30:</strong> New text</p>',
      });

      await WidgetService.appendToToday('New text');

      expect(mockDatabaseService.updateEntry).toHaveBeenCalledWith(
        mockEntry.id,
        expect.stringContaining('<p>Existing content</p>')
      );
      expect(mockDatabaseService.updateEntry).toHaveBeenCalledWith(
        mockEntry.id,
        expect.stringMatching(/<p><strong>\d{2}:\d{2}:<\/strong> New text<\/p>/)
      );
    });

    it('should create new entry when none exists', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(null);
      mockDatabaseService.createEntry.mockResolvedValue({
        id: 2,
        entry_date: new Date().toISOString().split('T')[0],
        html_body: '<p><strong>12:30:</strong> New entry</p>',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await WidgetService.appendToToday('New entry');

      expect(mockDatabaseService.createEntry).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/<p><strong>\d{2}:\d{2}:<\/strong> New entry<\/p>/)
      );
    });

    it('should format timestamp correctly', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(null);
      mockDatabaseService.createEntry.mockResolvedValue({
        id: 2,
        entry_date: new Date().toISOString().split('T')[0],
        html_body: '<p><strong>12:30:</strong> Test</p>',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await WidgetService.appendToToday('Test');

      expect(mockDatabaseService.createEntry).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringMatching(/<strong>\d{2}:\d{2}:<\/strong>/)
      );
    });

    it('should escape HTML in appended text', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(null);
      mockDatabaseService.createEntry.mockResolvedValue({
        id: 2,
        entry_date: new Date().toISOString().split('T')[0],
        html_body: '<p><strong>12:30:</strong> &lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;</p>',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await WidgetService.appendToToday('<script>alert("test")</script>');

      expect(mockDatabaseService.createEntry).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('&lt;script&gt;')
      );
      expect(mockDatabaseService.createEntry).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('&quot;test&quot;')
      );
    });

    it('should update widget data after appending', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);
      mockDatabaseService.updateEntry.mockResolvedValue(mockEntry);

      await WidgetService.appendToToday('Test');

      // updateWidgetData calls getEntryByDate again
      expect(mockDatabaseService.getEntryByDate).toHaveBeenCalledTimes(2);
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should throw error when database update fails', async () => {
      mockDatabaseService.getEntryByDate.mockResolvedValue(mockEntry);
      mockDatabaseService.updateEntry.mockRejectedValue(new Error('Update failed'));

      await expect(WidgetService.appendToToday('Test')).rejects.toThrow();
      expect(errorHandling.logError).toHaveBeenCalled();
    });
  });

  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(WidgetService.escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape less than', () => {
      expect(WidgetService.escapeHtml('A < B')).toBe('A &lt; B');
    });

    it('should escape greater than', () => {
      expect(WidgetService.escapeHtml('A > B')).toBe('A &gt; B');
    });

    it('should escape double quotes', () => {
      expect(WidgetService.escapeHtml('Say "hello"')).toBe('Say &quot;hello&quot;');
    });

    it('should escape single quotes', () => {
      expect(WidgetService.escapeHtml("It's working")).toBe('It&#039;s working');
    });

    it('should escape all special characters together', () => {
      const input = '<script>alert("XSS & \'injection\'")</script>';
      const output = WidgetService.escapeHtml(input);
      expect(output).toBe('&lt;script&gt;alert(&quot;XSS &amp; &#039;injection&#039;&quot;)&lt;/script&gt;');
    });

    it('should handle empty string', () => {
      expect(WidgetService.escapeHtml('')).toBe('');
    });

    it('should handle string with no special characters', () => {
      expect(WidgetService.escapeHtml('Normal text')).toBe('Normal text');
    });
  });

  describe('getLastUpdate', () => {
    it('should return valid timestamp', async () => {
      const timestamp = '2024-01-15T10:00:00.000Z';
      mockAsyncStorage.getItem.mockResolvedValue(timestamp);

      const result = await WidgetService.getLastUpdate();

      expect(result).toBe(timestamp);
    });

    it('should return null when no timestamp exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await WidgetService.getLastUpdate();

      expect(result).toBeNull();
    });

    it('should return null and log error for invalid timestamp', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-date');

      const result = await WidgetService.getLastUpdate();

      expect(result).toBeNull();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await WidgetService.getLastUpdate();

      expect(result).toBeNull();
      expect(errorHandling.logError).toHaveBeenCalled();
    });

    it('should validate ISO 8601 timestamp format', async () => {
      const validTimestamp = '2024-01-15T10:00:00.000Z';
      mockAsyncStorage.getItem.mockResolvedValue(validTimestamp);

      const result = await WidgetService.getLastUpdate();

      expect(result).toBe(validTimestamp);
      expect(errorHandling.logError).not.toHaveBeenCalled();
    });
  });
});
