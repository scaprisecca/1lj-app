import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BackupService } from './backup';
import { SettingsService, type AutoBackupFrequency } from './settings';
import { Platform } from 'react-native';

// Task name constant
const BACKUP_TASK_NAME = 'BACKGROUND_BACKUP_TASK';

// Retry configuration
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 5000; // 5 seconds

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Task Manager Service
 * Handles background task registration and scheduling for automatic backups
 */
export class TaskManagerService {
  /**
   * Define the background backup task
   * This function will be called by the OS when the background task runs
   */
  static defineBackupTask(): void {
    TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
      try {
        console.log('[BackgroundTask] Starting background backup...');

        // Check if auto-backup is enabled
        const frequency = await SettingsService.getSetting('autoBackupFrequency');

        if (frequency === 'off') {
          console.log('[BackgroundTask] Auto-backup is disabled, skipping');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Check if backup is due based on frequency
        const shouldBackup = await this.shouldPerformBackup(frequency);

        if (!shouldBackup) {
          console.log('[BackgroundTask] Backup not due yet, skipping');
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }

        // Perform the backup with retry logic
        const success = await this.performBackupWithRetry();

        if (success) {
          // Update last backup time
          await SettingsService.updateLastBackupTime();
          console.log('[BackgroundTask] Background backup completed successfully');
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } else {
          console.error('[BackgroundTask] Background backup failed after all retries');
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      } catch (error) {
        console.error('[BackgroundTask] Background backup failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Perform backup with retry logic
   * Attempts the backup up to MAX_RETRY_ATTEMPTS times with delays between attempts
   */
  private static async performBackupWithRetry(): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`[BackgroundTask] Backup attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

        // Perform the backup
        await BackupService.createBackup('automatic');

        console.log(`[BackgroundTask] Backup successful on attempt ${attempt}`);
        return true;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[BackgroundTask] Backup attempt ${attempt} failed:`, lastError.message);

        // If this wasn't the last attempt, wait before retrying
        if (attempt < MAX_RETRY_ATTEMPTS) {
          console.log(`[BackgroundTask] Waiting ${RETRY_DELAY_MS}ms before retry...`);
          await delay(RETRY_DELAY_MS);
        }
      }
    }

    console.error(
      `[BackgroundTask] All ${MAX_RETRY_ATTEMPTS} backup attempts failed. Last error:`,
      lastError?.message
    );
    return false;
  }

  /**
   * Register the background task with the OS
   * @param frequency - Backup frequency (daily/weekly/off)
   */
  static async registerBackupTask(frequency: AutoBackupFrequency): Promise<void> {
    try {
      // Unregister existing task first
      await this.unregisterBackupTask();

      // Don't register if frequency is 'off'
      if (frequency === 'off') {
        console.log('[TaskManager] Auto-backup disabled, task not registered');
        return;
      }

      // Check if background fetch is available
      const status = await BackgroundFetch.getStatusAsync();

      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('[TaskManager] Background fetch is disabled by user');
        throw new Error('Background tasks are disabled. Please enable them in system settings.');
      }

      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        console.warn('[TaskManager] Background fetch is restricted');
        throw new Error('Background tasks are restricted on this device.');
      }

      // Calculate interval in seconds
      const interval = this.getIntervalForFrequency(frequency);

      // Register the task
      await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
        minimumInterval: interval,
        stopOnTerminate: false, // Continue task even if app is terminated
        startOnBoot: true, // Start task when device boots (Android)
      });

      console.log(`[TaskManager] Background backup task registered with ${frequency} frequency`);
    } catch (error) {
      console.error('[TaskManager] Failed to register background task:', error);
      throw error;
    }
  }

  /**
   * Unregister the background task
   */
  static async unregisterBackupTask(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);

      if (isRegistered) {
        await BackgroundFetch.unregisterTaskAsync(BACKUP_TASK_NAME);
        console.log('[TaskManager] Background backup task unregistered');
      }
    } catch (error) {
      console.error('[TaskManager] Failed to unregister background task:', error);
      // Don't throw - unregister failures shouldn't block app functionality
    }
  }

  /**
   * Check if the background task is currently registered
   */
  static async isTaskRegistered(): Promise<boolean> {
    try {
      return await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
    } catch (error) {
      console.error('[TaskManager] Failed to check task registration:', error);
      return false;
    }
  }

  /**
   * Get the background fetch status
   */
  static async getBackgroundFetchStatus(): Promise<BackgroundFetch.BackgroundFetchStatus> {
    try {
      return await BackgroundFetch.getStatusAsync();
    } catch (error) {
      console.error('[TaskManager] Failed to get background fetch status:', error);
      return BackgroundFetch.BackgroundFetchStatus.Restricted;
    }
  }

  /**
   * Check if a backup should be performed based on frequency and last backup time
   */
  private static async shouldPerformBackup(frequency: AutoBackupFrequency): Promise<boolean> {
    if (frequency === 'off') {
      return false;
    }

    const lastBackupTime = await SettingsService.getSetting('lastBackupTime');

    if (!lastBackupTime) {
      // No previous backup, perform backup
      return true;
    }

    const now = new Date();
    const lastBackup = new Date(lastBackupTime);
    const timeSinceLastBackup = now.getTime() - lastBackup.getTime();

    // Convert to hours
    const hoursSinceLastBackup = timeSinceLastBackup / (1000 * 60 * 60);

    if (frequency === 'daily') {
      // Backup if more than 23 hours since last backup
      return hoursSinceLastBackup >= 23;
    } else if (frequency === 'weekly') {
      // Backup if more than 7 days (168 hours) since last backup
      return hoursSinceLastBackup >= 168;
    }

    return false;
  }

  /**
   * Convert frequency to interval in seconds
   */
  private static getIntervalForFrequency(frequency: AutoBackupFrequency): number {
    switch (frequency) {
      case 'daily':
        // Check every 12 hours for daily backups (minimum for reliability)
        // The task will check internally if 24 hours have passed
        return 60 * 60 * 12; // 12 hours in seconds
      case 'weekly':
        // Check once per day for weekly backups
        // The task will check internally if 7 days have passed
        return 60 * 60 * 24; // 24 hours in seconds
      case 'off':
      default:
        // Should not be called for 'off', but return a safe default
        return 60 * 60 * 24; // 24 hours in seconds
    }
  }

  /**
   * Manually trigger a background task (for testing)
   */
  static async triggerBackupTaskNow(): Promise<void> {
    try {
      console.log('[TaskManager] Manually triggering backup task...');
      await BackupService.createBackup('automatic');
      await SettingsService.updateLastBackupTime();
      console.log('[TaskManager] Manual backup trigger completed');
    } catch (error) {
      console.error('[TaskManager] Manual backup trigger failed:', error);
      throw error;
    }
  }

  /**
   * Update the backup frequency and re-register the task
   */
  static async updateBackupFrequency(frequency: AutoBackupFrequency): Promise<void> {
    try {
      // Update the setting
      await SettingsService.updateSetting('autoBackupFrequency', frequency);

      // Re-register the task with new frequency
      await this.registerBackupTask(frequency);

      console.log(`[TaskManager] Backup frequency updated to: ${frequency}`);
    } catch (error) {
      console.error('[TaskManager] Failed to update backup frequency:', error);
      throw error;
    }
  }

  /**
   * Get information about the current backup task status
   */
  static async getTaskStatus(): Promise<{
    isRegistered: boolean;
    backgroundFetchStatus: BackgroundFetch.BackgroundFetchStatus;
    frequency: AutoBackupFrequency;
    lastBackupTime: string | null;
  }> {
    const [isRegistered, backgroundFetchStatus, frequency, lastBackupTime] = await Promise.all([
      this.isTaskRegistered(),
      this.getBackgroundFetchStatus(),
      SettingsService.getSetting('autoBackupFrequency'),
      SettingsService.getSetting('lastBackupTime'),
    ]);

    return {
      isRegistered,
      backgroundFetchStatus,
      frequency,
      lastBackupTime,
    };
  }
}
