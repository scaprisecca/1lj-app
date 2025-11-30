import { SettingsService, AppSettings, AutoBackupFrequency } from '@/services/settings';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

const DEFAULT_SETTINGS: AppSettings = {
  characterLimit: 280,
  backupDestination: null,
  autoBackupFrequency: 'off',
  lastBackupTime: null,
};

describe('SettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loadSettings', () => {
    it('should return default settings when no settings are stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_settings');
    });

    it('should load and merge stored settings with defaults', async () => {
      const storedSettings = {
        characterLimit: 500,
        autoBackupFrequency: 'daily' as AutoBackupFrequency,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual({
        ...DEFAULT_SETTINGS,
        ...storedSettings,
      });
    });

    it('should return default settings on JSON parse error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('should return default settings on AsyncStorage error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const settings = await SettingsService.loadSettings();

      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe('saveSettings', () => {
    it('should save settings to AsyncStorage', async () => {
      const newSettings: AppSettings = {
        characterLimit: 500,
        backupDestination: '/path/to/backup',
        autoBackupFrequency: 'daily',
        lastBackupTime: '2025-01-01T00:00:00.000Z',
      };
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SettingsService.saveSettings(newSettings);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_settings',
        JSON.stringify(newSettings)
      );
    });

    it('should throw error when AsyncStorage fails', async () => {
      const newSettings = DEFAULT_SETTINGS;
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(SettingsService.saveSettings(newSettings)).rejects.toThrow(
        'Failed to save settings'
      );
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(DEFAULT_SETTINGS));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SettingsService.updateSetting('characterLimit', 500);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, characterLimit: 500 })
      );
    });

    it('should update autoBackupFrequency setting', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(DEFAULT_SETTINGS));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SettingsService.updateSetting('autoBackupFrequency', 'weekly');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, autoBackupFrequency: 'weekly' })
      );
    });

    it('should update backupDestination setting', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(DEFAULT_SETTINGS));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SettingsService.updateSetting('backupDestination', '/new/path');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, backupDestination: '/new/path' })
      );
    });

    it('should throw error when update fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(DEFAULT_SETTINGS));
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(SettingsService.updateSetting('characterLimit', 500)).rejects.toThrow(
        'Failed to update setting: characterLimit'
      );
    });
  });

  describe('getSetting', () => {
    it('should get a single setting value', async () => {
      const settings = { ...DEFAULT_SETTINGS, characterLimit: 500 };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const value = await SettingsService.getSetting('characterLimit');

      expect(value).toBe(500);
    });

    it('should get autoBackupFrequency setting', async () => {
      const settings = { ...DEFAULT_SETTINGS, autoBackupFrequency: 'daily' as AutoBackupFrequency };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const value = await SettingsService.getSetting('autoBackupFrequency');

      expect(value).toBe('daily');
    });

    it('should return default value on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const value = await SettingsService.getSetting('characterLimit');

      expect(value).toBe(DEFAULT_SETTINGS.characterLimit);
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SettingsService.resetSettings();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_settings',
        JSON.stringify(DEFAULT_SETTINGS)
      );
    });

    it('should throw error when reset fails', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      await expect(SettingsService.resetSettings()).rejects.toThrow('Failed to reset settings');
    });
  });

  describe('validateCharacterLimit', () => {
    it('should return true for valid character limits', () => {
      expect(SettingsService.validateCharacterLimit(100)).toBe(true);
      expect(SettingsService.validateCharacterLimit(280)).toBe(true);
      expect(SettingsService.validateCharacterLimit(500)).toBe(true);
      expect(SettingsService.validateCharacterLimit(10000)).toBe(true);
    });

    it('should return false for character limits below minimum', () => {
      expect(SettingsService.validateCharacterLimit(99)).toBe(false);
      expect(SettingsService.validateCharacterLimit(50)).toBe(false);
      expect(SettingsService.validateCharacterLimit(0)).toBe(false);
    });

    it('should return false for character limits above maximum', () => {
      expect(SettingsService.validateCharacterLimit(10001)).toBe(false);
      expect(SettingsService.validateCharacterLimit(20000)).toBe(false);
    });
  });

  describe('updateLastBackupTime', () => {
    it('should update last backup time to current timestamp', async () => {
      const mockDate = new Date('2025-01-15T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(DEFAULT_SETTINGS));
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await SettingsService.updateLastBackupTime();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@app_settings',
        JSON.stringify({ ...DEFAULT_SETTINGS, lastBackupTime: mockDate.toISOString() })
      );

      jest.restoreAllMocks();
    });
  });

  describe('formatLastBackupTime', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z');

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockNow);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return "Never" for null timestamp', () => {
      expect(SettingsService.formatLastBackupTime(null)).toBe('Never');
    });

    it('should return "Just now" for timestamps less than 1 minute ago', () => {
      const timestamp = new Date('2025-01-15T11:59:30.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp)).toBe('Just now');
    });

    it('should return minutes ago for timestamps less than 1 hour ago', () => {
      const timestamp1 = new Date('2025-01-15T11:59:00.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp1)).toBe('1 minute ago');

      const timestamp5 = new Date('2025-01-15T11:55:00.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp5)).toBe('5 minutes ago');
    });

    it('should return hours ago for timestamps less than 24 hours ago', () => {
      const timestamp1 = new Date('2025-01-15T11:00:00.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp1)).toBe('1 hour ago');

      const timestamp5 = new Date('2025-01-15T07:00:00.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp5)).toBe('5 hours ago');
    });

    it('should return days ago for timestamps less than 7 days ago', () => {
      const timestamp1 = new Date('2025-01-14T12:00:00.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp1)).toBe('1 day ago');

      const timestamp3 = new Date('2025-01-12T12:00:00.000Z').toISOString();
      expect(SettingsService.formatLastBackupTime(timestamp3)).toBe('3 days ago');
    });

    it('should return formatted date for timestamps 7+ days ago (same year)', () => {
      const timestamp = new Date('2025-01-01T12:00:00.000Z').toISOString();
      const result = SettingsService.formatLastBackupTime(timestamp);
      expect(result).toMatch(/Jan 1/);
    });

    it('should return formatted date with year for timestamps in different year', () => {
      const timestamp = new Date('2024-12-25T12:00:00.000Z').toISOString();
      const result = SettingsService.formatLastBackupTime(timestamp);
      expect(result).toMatch(/Dec 25.*2024/);
    });

    it('should return "Invalid Date" for invalid timestamp', () => {
      expect(SettingsService.formatLastBackupTime('invalid-date')).toBe('Invalid Date');
    });
  });
});
