import { getDatabase, isUsingMock } from '@/lib/database/client';
import { backupLogs, journalEntries, type BackupLog, type NewBackupLog } from '@/lib/database/schema';
import { desc, sql } from 'drizzle-orm';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditional import for expo-sharing to avoid web bundling issues
let Sharing: any;
if (Platform.OS !== 'web') {
  Sharing = require('expo-sharing');
}

// Types for backup settings
type BackupLocation = 'documents' | 'custom' | 'share';

interface BackupSettings {
  location: BackupLocation;
  customPath?: string;
  autoBackup: boolean;
}

export class BackupService {
  // Get user's backup preferences
  static async getBackupSettings(): Promise<BackupSettings> {
    try {
      const settings = await AsyncStorage.getItem('backupSettings');
      return settings ? JSON.parse(settings) : {
        location: 'documents',
        autoBackup: true
      };
    } catch (error) {
      console.error('Error loading backup settings:', error);
      return {
        location: 'documents',
        autoBackup: true
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
      const entries = await db.select().from(journalEntries).orderBy(desc(journalEntries.date));
      
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
      const filename = `journal-backup-${timestamp}.json`;
      
      let location = '';
      
      if (Platform.OS === 'web') {
        // Web platform - trigger download
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        location = 'Downloads';
      } else {
        // Mobile platforms - respect user's backup location preference
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, backupJson);
        location = fileUri;
        
        // Handle backup based on user preferences
        if (backupSettings.location === 'share' || (type === 'manual' && backupSettings.location !== 'documents')) {
          // Always share for manual backups or when user prefers sharing
          if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Save Journal Backup'
            });
          }
        } else if (backupSettings.location === 'documents') {
          // Save to app documents directory (default behavior)
          location = fileUri;
        } else if (backupSettings.location === 'custom' && backupSettings.customPath) {
          // For future implementation of custom paths
          // Currently falls back to documents + sharing
          if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Save Journal Backup to Custom Location'
            });
          }
        }
      }
      
      // Log the backup
      await db.insert(backupLogs).values({
        location,
        type,
        size: backupSize,
        status: 'success',
      });
      
      return location;
    } catch (error) {
      console.error('Error creating backup:', error);
      
      // Log failed backup
      if (!isUsingMock()) {
        try {
          const db = getDatabase();
          await db.insert(backupLogs).values({
            location: 'failed',
            type,
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
        .orderBy(desc(backupLogs.timestamp))
        .limit(20);
    } catch (error) {
      console.error('Error getting backup history:', error);
      return [];
    }
  }
  
  static async restoreFromBackup(backupData: string): Promise<void> {
    try {
      if (isUsingMock()) {
        // Mock implementation - just show console message
        console.log('Restore feature not available in mock mode');
        return;
      }

      const db = getDatabase();
      const data = JSON.parse(backupData);
      
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
            date: entry.date,
            content: entry.content,
            createdAt: entry.createdAt || entry.created_at,
            updatedAt: entry.updatedAt || entry.updated_at,
          });
          restoredCount++;
        } catch (insertError) {
          // Skip entries that already exist
          console.log('Skipping existing entry for date:', entry.date);
          skippedCount++;
        }
      }
      
      // Log the restore with details
      await db.insert(backupLogs).values({
        location: `restored (${restoredCount} new, ${skippedCount} skipped)`,
        type: 'manual',
        status: 'success',
        size: new Blob([backupData]).size,
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
        .where(sql`type = 'automatic' AND status = 'success'`)
        .orderBy(desc(backupLogs.timestamp))
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