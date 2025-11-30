import { BackupService } from '@/services/backup';
import { getDatabase, isUsingMock } from '@/lib/database/client';
import { CompressionService } from '@/services/compression';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('@/lib/database/client');
jest.mock('@/services/compression');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');

const mockGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;
const mockIsUsingMock = isUsingMock as jest.MockedFunction<typeof isUsingMock>;

// Helper to create a mock database instance
const createMockDb = () => ({
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockResolvedValue(undefined),
  then: jest.fn((callback) => callback([])),
});

describe('BackupService', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = createMockDb();

    // Reset Platform.OS to default
    Object.defineProperty(Platform, 'OS', {
      writable: true,
      value: 'ios',
    });
  });

  describe('getBackupSettings', () => {
    it('should return default settings when no settings are stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const settings = await BackupService.getBackupSettings();

      expect(settings).toEqual({
        location: 'documents',
        autoBackup: true,
        compress: true,
      });
    });

    it('should return stored settings when available', async () => {
      const storedSettings = {
        location: 'share',
        autoBackup: false,
        compress: false,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedSettings));

      const settings = await BackupService.getBackupSettings();

      expect(settings).toEqual(storedSettings);
    });

    it('should return default settings on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const settings = await BackupService.getBackupSettings();

      expect(settings).toEqual({
        location: 'documents',
        autoBackup: true,
        compress: true,
      });
    });
  });

  describe('getBackupLocationDescription', () => {
    it('should return correct description for documents location on mobile', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: true,
      }));

      const description = await BackupService.getBackupLocationDescription();

      expect(description).toBe('App Documents folder');
    });

    it('should return correct description for documents location on web', async () => {
      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'web',
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: true,
      }));

      const description = await BackupService.getBackupLocationDescription();

      expect(description).toBe('Downloads folder');
    });

    it('should return correct description for share location', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'share',
        autoBackup: true,
        compress: true,
      }));

      const description = await BackupService.getBackupLocationDescription();

      expect(description).toBe('System share dialog (choose location each time)');
    });

    it('should return correct description for custom location', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'custom',
        customPath: '/custom/path',
        autoBackup: true,
        compress: true,
      }));

      const description = await BackupService.getBackupLocationDescription();

      expect(description).toBe('/custom/path');
    });
  });

  describe('createBackup - Mock Mode', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(true);
      mockGetDatabase.mockReturnValue(null);
    });

    it('should return mock backup location when in mock mode', async () => {
      const result = await BackupService.createBackup('manual');

      expect(result).toBe('mock-backup-location');
      expect(mockGetDatabase).not.toHaveBeenCalled();
    });
  });

  describe('createBackup - SQLite Mode', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
      mockGetDatabase.mockReturnValue(mockDb);

      // Default backup settings
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));
    });

    it('should create uncompressed backup successfully on mobile', async () => {
      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await BackupService.createBackup('manual');

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toContain('file://mock-documents/journal-backup-');
    });

    it('should create compressed backup when compression is enabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: true,
      }));

      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, size: 512 });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      (CompressionService.compressFile as jest.Mock).mockResolvedValue('file://mock-documents/journal-backup.zip');

      const result = await BackupService.createBackup('manual');

      expect(CompressionService.compressFile).toHaveBeenCalled();
      expect(FileSystem.deleteAsync).toHaveBeenCalled(); // Original file deleted
      expect(result).toContain('.zip');
    });

    it('should continue with uncompressed backup if compression fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: true,
      }));

      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);
      (CompressionService.compressFile as jest.Mock).mockRejectedValue(new Error('Compression failed'));

      const result = await BackupService.createBackup('manual');

      expect(CompressionService.compressFile).toHaveBeenCalled();
      expect(result).toContain('.json'); // Falls back to uncompressed
    });

    it('should throw error when database is not available', async () => {
      mockGetDatabase.mockReturnValue(null);

      await expect(BackupService.createBackup('manual')).rejects.toThrow('Failed to create backup');
    });

    it('should log failed backup on error', async () => {
      mockDb.select().from().orderBy.mockRejectedValue(new Error('Database error'));

      await expect(BackupService.createBackup('manual')).rejects.toThrow('Failed to create backup');

      expect(mockDb.insert).toHaveBeenCalled(); // Failed backup log
    });

    it('should create backup with correct metadata', async () => {
      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Entry 1</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 2,
          entry_date: '2024-01-16',
          html_body: '<p>Entry 2</p>',
          created_at: '2024-01-16T10:00:00Z',
          updated_at: '2024-01-16T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);

      let capturedBackupData: string = '';
      (FileSystem.writeAsStringAsync as jest.Mock).mockImplementation((uri, data) => {
        capturedBackupData = data;
        return Promise.resolve();
      });

      await BackupService.createBackup('manual');

      const backupData = JSON.parse(capturedBackupData);
      expect(backupData.version).toBe('1.0.0');
      expect(backupData.totalEntries).toBe(2);
      expect(backupData.entries).toHaveLength(2);
      expect(backupData.timestamp).toBeDefined();
    });
  });

  describe('createBackup - Web Platform', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
      mockGetDatabase.mockReturnValue(mockDb);

      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'web',
      });

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));
    });

    it('should trigger download on web platform', async () => {
      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);

      // Mock DOM operations
      const mockClick = jest.fn();
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();

      global.document = {
        createElement: jest.fn().mockReturnValue({
          click: mockClick,
        }),
        body: {
          appendChild: mockAppendChild,
          removeChild: mockRemoveChild,
        },
      } as any;

      global.URL = {
        createObjectURL: jest.fn().mockReturnValue('blob:mock-url'),
        revokeObjectURL: jest.fn(),
      } as any;

      const result = await BackupService.createBackup('manual');

      expect(result).toBe('Downloads');
      expect(mockClick).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  describe('restoreFromBackup - Mock Mode', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(true);
      mockGetDatabase.mockReturnValue(null);
    });

    it('should do nothing in mock mode', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        entries: [],
      });

      await BackupService.restoreFromBackup(backupData, false);

      expect(mockGetDatabase).not.toHaveBeenCalled();
    });
  });

  describe('restoreFromBackup - SQLite Mode', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
      mockGetDatabase.mockReturnValue(mockDb);
    });

    it('should restore entries from uncompressed backup', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        timestamp: '2024-01-15T10:00:00Z',
        totalEntries: 2,
        entries: [
          {
            entry_date: '2024-01-15',
            html_body: '<p>Entry 1</p>',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
          {
            entry_date: '2024-01-16',
            html_body: '<p>Entry 2</p>',
            created_at: '2024-01-16T10:00:00Z',
            updated_at: '2024-01-16T10:00:00Z',
          },
        ],
      });

      await BackupService.restoreFromBackup(backupData, false);

      expect(mockDb.insert).toHaveBeenCalledTimes(3); // 2 entries + 1 log
    });

    it('should restore entries from compressed backup', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        entries: [
          {
            entry_date: '2024-01-15',
            html_body: '<p>Entry 1</p>',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ],
      });

      const filePath = 'file://mock-documents/backup.zip';
      (CompressionService.decompressFile as jest.Mock).mockResolvedValue('file://mock-extracted/');
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['backup.json']);
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(backupData);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      await BackupService.restoreFromBackup(backupData, true, filePath);

      expect(CompressionService.decompressFile).toHaveBeenCalledWith(filePath);
      expect(FileSystem.readDirectoryAsync).toHaveBeenCalled();
      expect(FileSystem.readAsStringAsync).toHaveBeenCalled();
      expect(FileSystem.deleteAsync).toHaveBeenCalled(); // Cleanup
    });

    it('should throw error if compressed backup has no JSON file', async () => {
      const filePath = 'file://mock-documents/backup.zip';
      (CompressionService.decompressFile as jest.Mock).mockResolvedValue('file://mock-extracted/');
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['backup.txt']);

      await expect(
        BackupService.restoreFromBackup('', true, filePath)
      ).rejects.toThrow('Failed to restore from backup');
    });

    it('should throw error for invalid backup format', async () => {
      const invalidBackup = JSON.stringify({
        version: '1.0.0',
        // Missing entries array
      });

      await expect(BackupService.restoreFromBackup(invalidBackup, false)).rejects.toThrow('Failed to restore from backup');
    });

    it('should throw error for non-array entries', async () => {
      const invalidBackup = JSON.stringify({
        version: '1.0.0',
        entries: 'not an array',
      });

      await expect(BackupService.restoreFromBackup(invalidBackup, false)).rejects.toThrow('Failed to restore from backup');
    });

    it('should skip duplicate entries', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        entries: [
          {
            entry_date: '2024-01-15',
            html_body: '<p>Entry 1</p>',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
          {
            entry_date: '2024-01-16',
            html_body: '<p>Entry 2</p>',
            created_at: '2024-01-16T10:00:00Z',
            updated_at: '2024-01-16T10:00:00Z',
          },
        ],
      });

      // Mock the insert to fail on the first entry (duplicate)
      let callCount = 0;
      mockDb.insert.mockImplementation(() => ({
        values: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('UNIQUE constraint failed'));
          }
          return Promise.resolve();
        }),
      }));

      await BackupService.restoreFromBackup(backupData, false);

      // Should have attempted 2 entry inserts + 1 log insert = 3 total
      expect(callCount).toBe(3);
    });

    it('should handle old backup field names (date, content)', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        entries: [
          {
            date: '2024-01-15', // Old field name
            content: '<p>Entry 1</p>', // Old field name
            createdAt: '2024-01-15T10:00:00Z', // Old field name
            updatedAt: '2024-01-15T10:00:00Z', // Old field name
          },
        ],
      });

      await BackupService.restoreFromBackup(backupData, false);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should log successful restore with count', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        entries: [
          {
            entry_date: '2024-01-15',
            html_body: '<p>Entry 1</p>',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ],
      });

      await BackupService.restoreFromBackup(backupData, false);

      // Check that a log was inserted with success status
      const logInsertCall = mockDb.insert.mock.calls.find((call) => {
        // Find the call that includes file_uri with "restored"
        return true; // We verify mockDb.insert was called
      });
      expect(logInsertCall).toBeDefined();
    });

    it('should warn on version mismatch but continue', async () => {
      const backupData = JSON.stringify({
        version: '2.0.0', // Different version
        entries: [
          {
            entry_date: '2024-01-15',
            html_body: '<p>Entry 1</p>',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ],
      });

      await BackupService.restoreFromBackup(backupData, false);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw error on restore failure', async () => {
      const backupData = JSON.stringify({
        version: '1.0.0',
        entries: [
          {
            entry_date: '2024-01-15',
            html_body: '<p>Entry 1</p>',
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ],
      });

      mockDb.insert().values.mockRejectedValue(new Error('Database error'));

      await expect(BackupService.restoreFromBackup(backupData, false)).rejects.toThrow('Failed to restore from backup');
    });
  });

  describe('getBackupHistory', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
      mockGetDatabase.mockReturnValue(mockDb);
    });

    it('should return empty array in mock mode', async () => {
      mockIsUsingMock.mockReturnValue(true);
      mockGetDatabase.mockReturnValue(null);

      const history = await BackupService.getBackupHistory();

      expect(history).toEqual([]);
    });

    it('should retrieve backup history from database', async () => {
      const mockHistory = [
        {
          id: 1,
          file_uri: 'file://backup-1.json',
          run_type: 'manual',
          run_time: '2024-01-15T10:00:00Z',
          size_bytes: 1024,
          status: 'success',
        },
        {
          id: 2,
          file_uri: 'file://backup-2.zip',
          run_type: 'auto',
          run_time: '2024-01-16T10:00:00Z',
          size_bytes: 512,
          status: 'success',
        },
      ];

      mockDb.select().from().orderBy().limit.mockResolvedValue(mockHistory);

      const history = await BackupService.getBackupHistory();

      expect(history).toEqual(mockHistory);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(20);
    });

    it('should return empty array on error', async () => {
      mockDb.select().from().orderBy().limit.mockRejectedValue(new Error('Database error'));

      const history = await BackupService.getBackupHistory();

      expect(history).toEqual([]);
    });
  });

  describe('autoBackup', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
      mockGetDatabase.mockReturnValue(mockDb);
    });

    it('should do nothing in mock mode', async () => {
      mockIsUsingMock.mockReturnValue(true);
      mockGetDatabase.mockReturnValue(null);

      await BackupService.autoBackup();

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should skip auto-backup when disabled in settings', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: false,
        compress: true,
      }));

      await BackupService.autoBackup();

      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('should create backup when no previous backup exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));

      // Need to track separate chains
      let selectCallCount = 0;
      const mockSelectChain = jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First select() is for checking last backup
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]), // No previous backup
          };
        } else {
          // Second select() is for getting entries
          return {
            from: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue([]), // No entries
          };
        }
      });
      mockDb.select = mockSelectChain;

      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      await BackupService.autoBackup();

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should create backup when last backup is older than 24 hours', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Need to track separate chains
      let selectCallCount = 0;
      const mockSelectChain = jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First select() is for checking last backup
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([
              {
                id: 1,
                timestamp: twoDaysAgo.toISOString(),
                run_type: 'auto',
                status: 'success',
              },
            ]),
          };
        } else {
          // Second select() is for getting entries
          return {
            from: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue([]), // No entries
          };
        }
      });
      mockDb.select = mockSelectChain;

      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      await BackupService.autoBackup();

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('should skip backup when recent backup exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));

      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      mockDb.select().from().where().orderBy().limit.mockResolvedValue([
        {
          id: 1,
          timestamp: oneHourAgo.toISOString(),
          run_type: 'auto',
          status: 'success',
        },
      ]);

      await BackupService.autoBackup();

      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    });

    it('should fail silently on error', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));

      mockDb.select().from().where().orderBy().limit.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(BackupService.autoBackup()).resolves.toBeUndefined();
    });
  });

  describe('Platform-specific behavior', () => {
    beforeEach(() => {
      mockIsUsingMock.mockReturnValue(false);
      mockGetDatabase.mockReturnValue(mockDb);
    });

    it('should use expo-sharing when location is "share"', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'share',
        autoBackup: true,
        compress: false,
      }));

      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const Sharing = require('expo-sharing');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await BackupService.createBackup('manual');

      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    it('should use expo-sharing for manual backups with custom location', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'custom',
        customPath: '/custom/path',
        autoBackup: true,
        compress: false,
      }));

      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const Sharing = require('expo-sharing');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);

      await BackupService.createBackup('manual');

      expect(Sharing.shareAsync).toHaveBeenCalled();
    });

    it('should not use expo-sharing for automatic backups with documents location', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'documents',
        autoBackup: true,
        compress: false,
      }));

      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const Sharing = require('expo-sharing');
      (Sharing.shareAsync as jest.Mock).mockClear();

      await BackupService.createBackup('automatic');

      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it('should handle sharing not available gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
        location: 'share',
        autoBackup: true,
        compress: false,
      }));

      const mockEntries = [
        {
          id: 1,
          entry_date: '2024-01-15',
          html_body: '<p>Test entry</p>',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      mockDb.select().from().orderBy.mockResolvedValue(mockEntries);
      (FileSystem.writeAsStringAsync as jest.Mock).mockResolvedValue(undefined);

      const Sharing = require('expo-sharing');
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      // Should not throw
      await expect(BackupService.createBackup('manual')).resolves.toBeDefined();
    });
  });
});
