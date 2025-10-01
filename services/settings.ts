import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@app_settings';

export type AutoBackupFrequency = 'off' | 'daily' | 'weekly';

export interface AppSettings {
  characterLimit: number;
  backupDestination: string | null;
  autoBackupFrequency: AutoBackupFrequency;
  lastBackupTime: string | null;
}

const DEFAULT_SETTINGS: AppSettings = {
  characterLimit: 280, // Default character limit (like Twitter)
  backupDestination: null,
  autoBackupFrequency: 'off',
  lastBackupTime: null,
};

/**
 * Settings Service
 * Manages application settings persistence
 */
export class SettingsService {
  /**
   * Load all settings from storage
   */
  static async loadSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        return { ...DEFAULT_SETTINGS, ...settings };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save all settings to storage
   */
  static async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw new Error('Failed to save settings');
    }
  }

  /**
   * Update a single setting
   */
  static async updateSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    try {
      const settings = await this.loadSettings();
      settings[key] = value;
      await this.saveSettings(settings);
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw new Error(`Failed to update setting: ${key}`);
    }
  }

  /**
   * Get a single setting
   */
  static async getSetting<K extends keyof AppSettings>(
    key: K
  ): Promise<AppSettings[K]> {
    try {
      const settings = await this.loadSettings();
      return settings[key];
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return DEFAULT_SETTINGS[key];
    }
  }

  /**
   * Reset all settings to defaults
   */
  static async resetSettings(): Promise<void> {
    try {
      await this.saveSettings(DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw new Error('Failed to reset settings');
    }
  }

  /**
   * Validate character limit
   */
  static validateCharacterLimit(limit: number): boolean {
    return limit >= 100 && limit <= 10000;
  }

  /**
   * Update last backup time
   */
  static async updateLastBackupTime(): Promise<void> {
    await this.updateSetting('lastBackupTime', new Date().toISOString());
  }

  /**
   * Get formatted last backup time
   */
  static formatLastBackupTime(isoString: string | null): string {
    if (!isoString) return 'Never';

    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch (error) {
      return 'Unknown';
    }
  }
}
