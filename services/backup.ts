import { getDatabase, isUsingMock } from '@/lib/database/client';
import { backupLogs, journalEntries, type BackupLog, type NewBackupLog } from '@/lib/database/schema';
import { desc, sql } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { CompressionService } from './compression';
import { sanitizeHtml } from '@/utils/html';
import { SettingsService, type BackupLocation } from './settings';

const ENTRY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RESTORED_HTML_BODY_LENGTH = 100 * 1024; // 100 KB

// A single validated, sanitized entry ready for insertion during restore.
interface RestorableEntry {
  entry_date: string;
  html_body: string;
  created_at?: string;
  updated_at?: string;
}

// Validates and sanitizes a raw entry from an untrusted backup file.
// Returns null if the entry doesn't meet the minimum shape requirements.
function toRestorableEntry(raw: any): RestorableEntry | null {
  if (!raw || typeof raw !== 'object') return null;

  const entry_date = raw.entry_date ?? raw.date; // support legacy field name
  const html_body = raw.html_body ?? raw.content; // support legacy field name

  if (typeof entry_date !== 'string' || !ENTRY_DATE_PATTERN.test(entry_date)) return null;
  if (typeof html_body !== 'string' || html_body.length > MAX_RESTORED_HTML_BODY_LENGTH) return null;

  const created_at = raw.created_at ?? raw.createdAt;
  const updated_at = raw.updated_at ?? raw.updatedAt;

  return {
    entry_date,
    html_body: sanitizeHtml(html_body),
    created_at: typeof created_at === 'string' ? created_at : undefined,
    updated_at: typeof updated_at === 'string' ? updated_at : undefined,
  };
}

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

// Backup location/compression preferences now live in SettingsService's
// @app_settings store (see M1) so there's a single source of truth instead
// of a second AsyncStorage key that the Settings screen never reads.
interface BackupSettings {
  location: BackupLocation;
  compress: boolean;
}

export class BackupService {
  // Get user's backup preferences
  static async getBackupSettings(): Promise<BackupSettings> {
    const settings = await SettingsService.loadSettings();
    return {
      location: settings.backupLocation,
      compress: settings.backupCompress,
    };
  }

  static async createBackup(type: 'manual' | 'automatic' = 'automatic', password?: string): Promise<string> {
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

        // A password only encrypts anything if the backup is zipped, so a
        // password request implies compression regardless of the user's
        // compress setting.
        const shouldCompress = backupSettings.compress || !!password;

        if (shouldCompress) {
          try {
            console.log('[Backup] Compressing backup...');
            const compressedUri = await CompressionService.compressFile(
              fileUri,
              `${FileSystem.documentDirectory}${compressedFilename}`,
              password
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
            console.error('[Backup] Compression failed:', compressionError);
            if (password) {
              // Never fall back to a plaintext export when the user asked
              // for password protection - that would silently produce an
              // unencrypted file instead of the encrypted one they expect.
              await FileSystem.deleteAsync(fileUri, { idempotent: true });
              throw new Error('Failed to create password-protected backup');
            }
            // Continue with uncompressed backup
          }
        }

        file_uri = fileUri;

        // Handle backup based on user preferences
        const mimeType = shouldCompress ? 'application/zip' : 'application/json';

        if (backupSettings.location === 'share') {
          if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType,
              dialogTitle: 'Save Journal Backup'
            });
          }
        }
        // 'documents' location: file already saved to fileUri above, nothing more to do.
      }
      
      // Log the backup using new schema with actual final size
      await db.insert(backupLogs).values({
        file_uri,
        run_type: type === 'manual' ? 'manual' : 'auto',
        size_bytes: finalSize,
        status: 'success',
      });

      // Prune old backup files and log rows so they don't accumulate forever
      if (Platform.OS !== 'web') {
        await this.pruneOldBackupFiles();
      }
      await this.pruneOldBackupLogs();

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

  // Keep only the newest N backup files in the documents directory
  private static async pruneOldBackupFiles(maxFiles: number = 5): Promise<void> {
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) return;

      const files = await FileSystem.readDirectoryAsync(dir);
      const backupFiles = files
        .filter((f) => f.startsWith('journal-backup-'))
        .sort(); // timestamps in the filename sort lexicographically (oldest first)

      const filesToDelete = backupFiles.slice(0, Math.max(0, backupFiles.length - maxFiles));
      for (const file of filesToDelete) {
        await FileSystem.deleteAsync(`${dir}${file}`, { idempotent: true });
      }
    } catch (error) {
      console.error('Error pruning old backup files:', error);
      // Don't fail the backup because cleanup failed
    }
  }

  // Keep only the newest N backup_logs rows
  private static async pruneOldBackupLogs(maxRows: number = 50): Promise<void> {
    try {
      const db = getDatabase();
      if (!db) return;

      const rows = await db.select({ id: backupLogs.id })
        .from(backupLogs)
        .orderBy(desc(backupLogs.run_time));

      const idsToDelete = rows.slice(maxRows).map((r: { id: number }) => r.id);
      for (const id of idsToDelete) {
        await db.delete(backupLogs).where(sql`id = ${id}`);
      }
    } catch (error) {
      console.error('Error pruning old backup logs:', error);
      // Don't fail the backup because cleanup failed
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
  
  static async restoreFromBackup(backupData: string, isCompressed: boolean = false, filePath?: string, password?: string): Promise<void> {
    try {
      if (isUsingMock()) {
        // Mock implementation - just show console message
        console.log('Restore feature not available in mock mode');
        return;
      }

      const db = getDatabase();
      let data;
      // Tracks the JSON string actually restored, so the logged size reflects
      // reality even for compressed backups (where `backupData` is unused).
      let restoredJsonString: string;

      // Handle compressed backups
      if (isCompressed && filePath) {
        console.log('[Backup] Decompressing backup file...');
        const extractedDir = await CompressionService.decompressFile(filePath, undefined, password);

        // Read the extracted JSON file (assuming it's named backup.json in the archive)
        const jsonFiles = await FileSystem.readDirectoryAsync(extractedDir);
        const jsonFile = jsonFiles.find(f => f.endsWith('.json'));

        if (!jsonFile) {
          throw new Error('No JSON file found in compressed backup');
        }

        const jsonContent = await FileSystem.readAsStringAsync(`${extractedDir}${jsonFile}`);
        restoredJsonString = jsonContent;
        data = JSON.parse(jsonContent);

        // Clean up extracted files
        await FileSystem.deleteAsync(extractedDir, { idempotent: true });
      } else {
        restoredJsonString = backupData;
        data = JSON.parse(backupData);
      }

      if (!data || typeof data !== 'object' || !Array.isArray(data.entries)) {
        throw new Error('Invalid backup format');
      }

      // Validate backup version compatibility
      if (data.version && data.version !== '1.0.0') {
        console.warn('Backup version mismatch, proceeding with caution');
      }

      let restoredCount = 0;
      let skippedCount = 0;
      let invalidCount = 0;

      // Validate and sanitize every entry up front - untrusted backup files
      // must not reach the database (or later, a WebView) unsanitized.
      const restorableEntries: RestorableEntry[] = [];
      for (const rawEntry of data.entries) {
        const restorable = toRestorableEntry(rawEntry);
        if (!restorable) {
          invalidCount++;
          continue;
        }
        restorableEntries.push(restorable);
      }

      // Clear existing entries (if user confirms)
      // For now, we'll just insert new entries and let the unique constraint handle conflicts

      await db.transaction(async (tx: typeof db) => {
        for (const entry of restorableEntries) {
          try {
            await tx.insert(journalEntries).values(entry);
            restoredCount++;
          } catch (insertError) {
            // Skip entries that already exist
            console.log('Skipping existing entry for date:', entry.entry_date);
            skippedCount++;
          }
        }
      });

      // Log the restore with details
      await db.insert(backupLogs).values({
        file_uri: `restored (${restoredCount} new, ${skippedCount} skipped, ${invalidCount} invalid)`,
        run_type: 'manual',
        status: 'success',
        size_bytes: new Blob([restoredJsonString]).size,
      });

      console.log(`Restore complete: ${restoredCount} entries restored, ${skippedCount} entries skipped, ${invalidCount} entries invalid`);
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      const message = error instanceof Error ? error.message : '';
      if (/password/i.test(message)) {
        throw new Error('Incorrect password. Please try again.');
      }
      throw new Error('Failed to restore from backup');
    }
  }
  
  static async autoBackup(): Promise<void> {
    try {
      if (isUsingMock()) {
        // Mock implementation - do nothing
        return;
      }

      // Check if auto-backup is enabled — driven by the same
      // autoBackupFrequency setting the Settings screen and background
      // task use, so this can't disagree with what the user configured.
      const frequency = await SettingsService.getSetting('autoBackupFrequency');
      if (frequency === 'off') {
        console.log('Auto-backup is disabled');
        return;
      }

      const db = getDatabase();
      // Only auto-backup if there are entries and it's been a while since last backup
      const lastBackup: BackupLog[] = await db.select()
        .from(backupLogs)
        .where(sql`run_type = 'auto' AND status = 'success'`)
        .orderBy(desc(backupLogs.run_time))
        .limit(1);

      const now = new Date();
      const lastRunTime = lastBackup[0] ? new Date(lastBackup[0].run_time).getTime() : NaN;
      const shouldBackup = !lastBackup[0] ||
        Number.isNaN(lastRunTime) ||
        (now.getTime() - lastRunTime) > 24 * 60 * 60 * 1000; // 24 hours
      
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
      default:
        return 'Default location';
    }
  }
}