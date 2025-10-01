import { getDatabase, isUsingMock } from '@/lib/database/client';
import { backupLogs, journalEntries, type BackupLog, type NewBackupLog } from '@/lib/database/schema';
import { desc, sql } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CompressionService } from './compression';

// Type definition for expo-sharing module
interface SharingModule {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (url: string, options?: { mimeType?: string; dialogTitle?: string }) => Promise<void>;
}

// Conditional import for expo-sharing to avoid web bundling issues
let Sharing: SharingModule | null = null;
if (Platform.OS !== 'web') {
  Sharing = require('expo-sharing');
}

// Types for backup settings
type BackupLocation = 'documents' | 'custom' | 'share';

interface BackupSettings {
  location: BackupLocation;
  customPath?: string;
  autoBackup: boolean;
  compress?: boolean; // Whether to compress backups
}

export class BackupService {
  // Get user's backup preferences
  static async getBackupSettings(): Promise<BackupSettings> {
    try {
      const settings = await AsyncStorage.getItem('backupSettings');
      return settings ? JSON.parse(settings) : {
        location: 'documents',
        autoBackup: true,
        compress: true // Enable compression by default
      };
    } catch (error) {
      console.error('Error loading backup settings:', error);
      return {
        location: 'documents',
        autoBackup: true,
        compress: true
      };
    }
  }

  static async createBackup(type: 'manual' | 'automatic' = 'automatic'): Promise<string> {
    try {
      if (isUsingMock()) {
        // Mock implementation - just show alert
        console.log('Backup feature not available in mock mode');
        return 'mock-backup-location';
      }

      const db = getDatabase();
      if (!db) throw new Error('Database not available');
      
      // Get user's backup preferences
      const backupSettings = await this.getBackupSettings();
      
      // Get all journal entries
      const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.entry_date));
      
      // Create backup data
      const backupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        totalEntries: entries.length,
        entries: entries,
        backupSettings: {
          createdWith: backupSettings.location,
          createdAt: new Date().toISOString()
        }
      };
      
      const backupJson = JSON.stringify(backupData, null, 2);
      const backupSize = new Blob([backupJson]).size;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const baseFilename = `journal-backup-${timestamp}`;
      const jsonFilename = `${baseFilename}.json`;
      const compressedFilename = `${baseFilename}.zip`;

      let file_uri = '';
      let finalSize = backupSize;
      
      if (Platform.OS === 'web') {
        // Web platform - trigger download (no compression on web)
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = jsonFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        file_uri = 'Downloads';
      } else {
        // Mobile platforms - respect user's backup location preference
        let fileUri = `${FileSystem.documentDirectory}${jsonFilename}`;
        await FileSystem.writeAsStringAsync(fileUri, backupJson);

        // Compress the backup if enabled
        if (backupSettings.compress) {
          try {
            console.log('[Backup] Compressing backup...');
            const compressedUri = await CompressionService.compressFile(
              fileUri,
              `${FileSystem.documentDirectory}${compressedFilename}`
            );

            // Get compressed file size
            const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
            finalSize = compressedInfo.size || backupSize;

            // Delete the uncompressed file
            await FileSystem.deleteAsync(fileUri, { idempotent: true });

            // Use the compressed file
            fileUri = compressedUri;
            console.log(`[Backup] Backup compressed successfully: ${CompressionService.formatFileSize(finalSize)}`);
          } catch (compressionError) {
            console.error('[Backup] Compression failed, using uncompressed backup:', compressionError);
            // Continue with uncompressed backup
          }
        }

        file_uri = fileUri;

        // Handle backup based on user preferences
        const mimeType = backupSettings.compress ? 'application/zip' : 'application/json';

        if (backupSettings.location === 'share' || (type === 'manual' && backupSettings.location !== 'documents')) {
          // Always share for manual backups or when user prefers sharing
          if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType,
              dialogTitle: 'Save Journal Backup'
            });
          }
        } else if (backupSettings.location === 'documents') {
          // Save to app documents directory (default behavior)
          file_uri = fileUri;
        } else if (backupSettings.location === 'custom' && backupSettings.customPath) {
          // For future implementation of custom paths
          // Currently falls back to documents + sharing
          if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType,
              dialogTitle: 'Save Journal Backup to Custom Location'
            });
          }
        }
      }
      
      // Log the backup using new schema with actual final size
      await db.insert(backupLogs).values({
        file_uri,
        run_type: type === 'manual' ? 'manual' : 'auto',
        size_bytes: finalSize,
        status: 'success',
      });
      
      return file_uri;
    } catch (error) {
      console.error('Error creating backup:', error);
      
      // Log failed backup
      if (!isUsingMock()) {
        try {
          const db = getDatabase();
          await db.insert(backupLogs).values({
            file_uri: 'failed',
            run_type: type === 'manual' ? 'manual' : 'auto',
            status: 'failed',
          });
        } catch (logError) {
          console.error('Error logging failed backup:', logError);
        }
      }
      
      throw new Error('Failed to create backup');
    }
  }
  
  static async getBackupHistory(): Promise<BackupLog[]> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        return [];
      }

      const db = getDatabase();
      return await db.select()
        .from(backupLogs)
        .orderBy(desc(backupLogs.run_time))
        .limit(20);
    } catch (error) {
      console.error('Error getting backup history:', error);
      return [];
    }
  }
  
  static async restoreFromBackup(backupData: string, isCompressed: boolean = false, filePath?: string): Promise<void> {
    try {
      if (isUsingMock()) {
        // Mock implementation - just show console message
        console.log('Restore feature not available in mock mode');
        return;
      }

      const db = getDatabase();
      let data;

      // Handle compressed backups
      if (isCompressed && filePath) {
        console.log('[Backup] Decompressing backup file...');
        const extractedDir = await CompressionService.decompressFile(filePath);

        // Read the extracted JSON file (assuming it's named backup.json in the archive)
        const jsonFiles = await FileSystem.readDirectoryAsync(extractedDir);
        const jsonFile = jsonFiles.find(f => f.endsWith('.json'));

        if (!jsonFile) {
          throw new Error('No JSON file found in compressed backup');
        }

        const jsonContent = await FileSystem.readAsStringAsync(`${extractedDir}${jsonFile}`);
        data = JSON.parse(jsonContent);

        // Clean up extracted files
        await FileSystem.deleteAsync(extractedDir, { idempotent: true });
      } else {
        data = JSON.parse(backupData);
      }
      
      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid backup format');
      }
      
      // Validate backup version compatibility
      if (data.version && data.version !== '1.0.0') {
        console.warn('Backup version mismatch, proceeding with caution');
      }
      
      let restoredCount = 0;
      let skippedCount = 0;
      
      // Clear existing entries (if user confirms)
      // For now, we'll just insert new entries and let the unique constraint handle conflicts
      
      for (const entry of data.entries) {
        try {
          await db.insert(journalEntries).values({
            entry_date: entry.entry_date || entry.date, // Support both old and new field names
            html_body: entry.html_body || entry.content, // Support both old and new field names
            created_at: entry.created_at || entry.createdAt,
            updated_at: entry.updated_at || entry.updatedAt,
          });
          restoredCount++;
        } catch (insertError) {
          // Skip entries that already exist
          console.log('Skipping existing entry for date:', entry.entry_date || entry.date);
          skippedCount++;
        }
      }
      
      // Log the restore with details
      await db.insert(backupLogs).values({
        file_uri: `restored (${restoredCount} new, ${skippedCount} skipped)`,
        run_type: 'manual',
        status: 'success',
        size_bytes: new Blob([backupData]).size,
      });
      
      console.log(`Restore complete: ${restoredCount} entries restored, ${skippedCount} entries skipped`);
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw new Error('Failed to restore from backup');
    }
  }
  
  static async autoBackup(): Promise<void> {
    try {
      if (isUsingMock()) {
        // Mock implementation - do nothing
        return;
      }

      // Check if auto-backup is enabled
      const backupSettings = await this.getBackupSettings();
      if (!backupSettings.autoBackup) {
        console.log('Auto-backup is disabled');
        return;
      }

      const db = getDatabase();
      // Only auto-backup if there are entries and it's been a while since last backup
      const lastBackup = await db.select()
        .from(backupLogs)
        .where(sql`run_type = 'auto' AND status = 'success'`)
        .orderBy(desc(backupLogs.run_time))
        .limit(1);
      
      const now = new Date();
      const shouldBackup = !lastBackup[0] || 
        (now.getTime() - new Date(lastBackup[0].timestamp).getTime()) > 24 * 60 * 60 * 1000; // 24 hours
      
      if (shouldBackup) {
        await this.createBackup('automatic');
        console.log('Auto-backup completed successfully');
      } else {
        console.log('Auto-backup skipped - recent backup exists');
      }
    } catch (error) {
      console.error('Error in auto backup:', error);
      // Don't throw - auto backup should fail silently
    }
  }

  // New: Get backup location description for UI
  static async getBackupLocationDescription(): Promise<string> {
    const settings = await this.getBackupSettings();
    
    switch (settings.location) {
      case 'documents':
        return Platform.OS === 'web' ? 'Downloads folder' : 'App Documents folder';
      case 'share':
        return 'System share dialog (choose location each time)';
      case 'custom':
        return settings.customPath || 'Custom location';
      default:
        return 'Default location';
    }
  }
}