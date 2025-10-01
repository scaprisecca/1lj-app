/**
 * Common Type Definitions
 * Shared types used across the application
 */

import type { JournalEntry, BackupLog } from '@/lib/database/schema';
import type { AutoBackupFrequency, AppSettings } from '@/services/settings';
import type { WidgetData } from '@/services/widget';
import * as BackgroundFetch from 'expo-background-fetch';

/**
 * Task Manager Types
 */
export interface TaskStatus {
  isRegistered: boolean;
  backgroundFetchStatus: BackgroundFetch.BackgroundFetchStatus;
  frequency: AutoBackupFrequency;
  lastBackupTime: string | null;
}

/**
 * Compression Types
 */
export interface CompressionResult {
  outputPath: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Backup Types
 */
export interface BackupData {
  version: string;
  timestamp: string;
  totalEntries: number;
  entries: JournalEntry[];
  backupSettings?: {
    createdWith: string;
    createdAt: string;
  };
}

export interface BackupRestoreResult {
  restoredCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Component Props Types
 */
export interface CalendarDate {
  year: number;
  month: number;
  day: number;
  date: string; // YYYY-MM-DD format
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Navigation Types
 */
export interface EntryDetailParams {
  date: string;
}

/**
 * Error Types
 */
export interface ErrorDetails {
  code?: string;
  message: string;
  context?: string;
  timestamp: Date;
}

/**
 * Loading State Types
 */
export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ErrorDetails;
  success: boolean;
}

/**
 * Re-export commonly used types
 */
export type {
  JournalEntry,
  BackupLog,
  AutoBackupFrequency,
  AppSettings,
  WidgetData,
};
