import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from './database';
import type { JournalEntry } from '@/lib/database/schema';
import WidgetManager from '@/modules/widget-manager';
import { logError, createWidgetError } from '@/utils/errorHandling';

const WIDGET_DATA_KEY = '@widget_today_entry';
const WIDGET_LAST_UPDATE_KEY = '@widget_last_update';

export interface WidgetData {
  date: string;
  htmlContent: string;
  plainTextPreview: string;
  lastUpdate: string;
}

/**
 * Widget Data Service
 * Manages data sharing between the main app and home widgets
 */
export class WidgetService {
  /**
   * Convert HTML to plain text for widget display
   */
  static htmlToPlainText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Truncate text for widget display
   */
  static truncateText(text: string, maxLength: number = 80): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Update widget data with today's entry
   */
  static async updateWidgetData(): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const entry = await DatabaseService.getEntryByDate(today);

      if (!entry && entry !== null) {
        throw createWidgetError('Failed to retrieve entry from database');
      }

      const widgetData: WidgetData = {
        date: today,
        htmlContent: entry?.html_body || '',
        plainTextPreview: entry
          ? this.truncateText(this.htmlToPlainText(entry.html_body))
          : 'No entry for today',
        lastUpdate: new Date().toISOString(),
      };

      await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(widgetData));
      await AsyncStorage.setItem(WIDGET_LAST_UPDATE_KEY, widgetData.lastUpdate);

      // Trigger widget refresh on native side
      try {
        await WidgetManager.reloadWidgets();
      } catch (error) {
        // Widget reload may not be supported on all platforms
        logError(error, 'WidgetService.reloadWidgets');
      }
    } catch (error) {
      logError(error, 'WidgetService.updateWidgetData');
      throw createWidgetError('Failed to update widget data', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get current widget data
   */
  static async getWidgetData(): Promise<WidgetData | null> {
    try {
      const data = await AsyncStorage.getItem(WIDGET_DATA_KEY);
      if (!data) return null;

      const parsedData = JSON.parse(data);

      // Validate parsed data structure
      if (!parsedData.date || !parsedData.lastUpdate) {
        logError('Invalid widget data structure', 'WidgetService.getWidgetData');
        return null;
      }

      return parsedData;
    } catch (error) {
      logError(error, 'WidgetService.getWidgetData');
      return null;
    }
  }

  /**
   * Append text to today's entry (used by widget)
   */
  static async appendToToday(text: string): Promise<void> {
    if (!text || text.trim().length === 0) {
      throw createWidgetError('Cannot append empty text to entry');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const entry = await DatabaseService.getEntryByDate(today);

      // Format timestamp
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const timestamp = `${hours}:${minutes}`;

      // Create append text with timestamp
      const appendText = `<p><strong>${timestamp}:</strong> ${this.escapeHtml(text)}</p>`;

      if (entry) {
        // Append to existing entry
        const newContent = entry.html_body + appendText;
        await DatabaseService.updateEntry(entry.id, newContent);
      } else {
        // Create new entry
        await DatabaseService.createEntry(today, appendText);
      }

      // Update widget data
      await this.updateWidgetData();
    } catch (error) {
      logError(error, 'WidgetService.appendToToday');
      throw createWidgetError('Failed to append text to today\'s entry', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get last update timestamp
   */
  static async getLastUpdate(): Promise<string | null> {
    try {
      const lastUpdate = await AsyncStorage.getItem(WIDGET_LAST_UPDATE_KEY);

      // Validate timestamp format
      if (lastUpdate && isNaN(Date.parse(lastUpdate))) {
        logError('Invalid timestamp format in last update', 'WidgetService.getLastUpdate');
        return null;
      }

      return lastUpdate;
    } catch (error) {
      logError(error, 'WidgetService.getLastUpdate');
      return null;
    }
  }
}
