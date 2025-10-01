/**
 * Data Migration Utilities
 *
 * This file provides utilities for migrating data from old schema to new PRD-compliant schema.
 *
 * Old Schema -> New Schema:
 * journal_entries:
 *   - date -> entry_date
 *   - content -> html_body
 *
 * backup_logs:
 *   - location -> file_uri
 *   - type -> run_type (also: 'automatic' -> 'auto')
 *   - timestamp -> run_time
 *   - size -> size_bytes
 */

import { getDatabase, isUsingMock } from '../client';
import { sql } from 'drizzle-orm';

interface OldJournalEntry {
  id: number;
  date?: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface OldBackupLog {
  id: number;
  location?: string;
  type?: string;
  timestamp?: string;
  size?: number;
}

export class DataMigration {
  /**
   * Check if data migration is needed
   * Returns true if old field names are found in the database
   */
  static async needsMigration(): Promise<boolean> {
    if (isUsingMock()) {
      console.log('Mock database - no migration needed');
      return false;
    }

    const db = getDatabase();
    if (!db) return false;

    try {
      // Check if old columns exist
      const tableInfo = await db.all(sql`PRAGMA table_info(journal_entries)`);
      const hasOldColumns = tableInfo.some(
        (col: any) => col.name === 'date' || col.name === 'content'
      );

      return hasOldColumns;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Migrate journal entries from old schema to new schema
   */
  static async migrateJournalEntries(): Promise<{ migrated: number; errors: number }> {
    if (isUsingMock()) {
      return { migrated: 0, errors: 0 };
    }

    const db = getDatabase();
    if (!db) throw new Error('Database not available');

    let migrated = 0;
    let errors = 0;

    try {
      console.log('🔄 Migrating journal entries...');

      // Check if old columns exist
      const tableInfo = await db.all(sql`PRAGMA table_info(journal_entries)`);
      const columns = tableInfo.map((col: any) => col.name);

      const hasOldDateColumn = columns.includes('date');
      const hasOldContentColumn = columns.includes('content');

      if (!hasOldDateColumn && !hasOldContentColumn) {
        console.log('✅ Journal entries already using new schema');
        return { migrated: 0, errors: 0 };
      }

      // Get all entries (may have mixed old/new field names)
      const entries = await db.all(sql`SELECT * FROM journal_entries`);

      for (const entry of entries) {
        try {
          const oldEntry = entry as OldJournalEntry;

          // Determine which fields to use (support both old and new)
          const entryDate = oldEntry.date || (entry as any).entry_date;
          const htmlBody = oldEntry.content || (entry as any).html_body;
          const createdAt = oldEntry.created_at || oldEntry.createdAt || (entry as any).created_at;
          const updatedAt = oldEntry.updated_at || oldEntry.updatedAt || (entry as any).updated_at;

          // Update with new field names if needed
          if (oldEntry.date || oldEntry.content) {
            await db.run(
              sql`UPDATE journal_entries
                  SET entry_date = ${entryDate},
                      html_body = ${htmlBody},
                      created_at = ${createdAt},
                      updated_at = ${updatedAt}
                  WHERE id = ${oldEntry.id}`
            );
            migrated++;
          }
        } catch (error) {
          console.error(`Error migrating journal entry ${entry.id}:`, error);
          errors++;
        }
      }

      // After successful migration, rename columns if they still exist
      if (hasOldDateColumn || hasOldContentColumn) {
        await this.renameJournalColumns(db);
      }

      console.log(`✅ Migrated ${migrated} journal entries (${errors} errors)`);
      return { migrated, errors };
    } catch (error) {
      console.error('Error migrating journal entries:', error);
      throw error;
    }
  }

  /**
   * Rename old columns to new PRD-compliant names
   */
  private static async renameJournalColumns(db: any): Promise<void> {
    try {
      console.log('🔄 Renaming journal_entries columns...');

      // SQLite doesn't support RENAME COLUMN directly in older versions
      // We need to create a new table and copy data
      await db.exec(sql`
        BEGIN TRANSACTION;

        -- Create temporary table with new schema
        CREATE TABLE journal_entries_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          entry_date TEXT NOT NULL UNIQUE,
          html_body TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        );

        -- Copy data from old table (handle both old and new column names)
        INSERT INTO journal_entries_new (id, entry_date, html_body, created_at, updated_at)
        SELECT
          id,
          COALESCE(entry_date, date) as entry_date,
          COALESCE(html_body, content) as html_body,
          COALESCE(created_at, createdAt, CURRENT_TIMESTAMP) as created_at,
          COALESCE(updated_at, updatedAt, CURRENT_TIMESTAMP) as updated_at
        FROM journal_entries;

        -- Drop old table
        DROP TABLE journal_entries;

        -- Rename new table
        ALTER TABLE journal_entries_new RENAME TO journal_entries;

        COMMIT;
      `);

      console.log('✅ Renamed journal_entries columns');
    } catch (error) {
      console.error('Error renaming columns:', error);
      throw error;
    }
  }

  /**
   * Migrate backup logs from old schema to new schema
   */
  static async migrateBackupLogs(): Promise<{ migrated: number; errors: number }> {
    if (isUsingMock()) {
      return { migrated: 0, errors: 0 };
    }

    const db = getDatabase();
    if (!db) throw new Error('Database not available');

    let migrated = 0;
    let errors = 0;

    try {
      console.log('🔄 Migrating backup logs...');

      // Check if old columns exist
      const tableInfo = await db.all(sql`PRAGMA table_info(backup_logs)`);
      const columns = tableInfo.map((col: any) => col.name);

      const hasOldColumns =
        columns.includes('location') ||
        columns.includes('type') ||
        columns.includes('timestamp') ||
        columns.includes('size');

      if (!hasOldColumns) {
        console.log('✅ Backup logs already using new schema');
        return { migrated: 0, errors: 0 };
      }

      // Get all backup logs
      const logs = await db.all(sql`SELECT * FROM backup_logs`);

      for (const log of logs) {
        try {
          const oldLog = log as OldBackupLog;

          // Determine which fields to use
          const fileUri = oldLog.location || (log as any).file_uri;
          let runType = oldLog.type || (log as any).run_type;

          // Convert 'automatic' to 'auto' (PRD spec)
          if (runType === 'automatic') {
            runType = 'auto';
          }

          const runTime = oldLog.timestamp || (log as any).run_time;
          const sizeBytes = oldLog.size || (log as any).size_bytes;

          // Update with new field names if needed
          if (oldLog.location || oldLog.type || oldLog.timestamp || oldLog.size) {
            await db.run(
              sql`UPDATE backup_logs
                  SET file_uri = ${fileUri},
                      run_type = ${runType},
                      run_time = ${runTime},
                      size_bytes = ${sizeBytes}
                  WHERE id = ${oldLog.id}`
            );
            migrated++;
          }
        } catch (error) {
          console.error(`Error migrating backup log ${log.id}:`, error);
          errors++;
        }
      }

      // After successful migration, rename columns if they still exist
      if (hasOldColumns) {
        await this.renameBackupLogColumns(db);
      }

      console.log(`✅ Migrated ${migrated} backup logs (${errors} errors)`);
      return { migrated, errors };
    } catch (error) {
      console.error('Error migrating backup logs:', error);
      throw error;
    }
  }

  /**
   * Rename old backup_logs columns to new PRD-compliant names
   */
  private static async renameBackupLogColumns(db: any): Promise<void> {
    try {
      console.log('🔄 Renaming backup_logs columns...');

      await db.exec(sql`
        BEGIN TRANSACTION;

        -- Create temporary table with new schema
        CREATE TABLE backup_logs_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          file_uri TEXT NOT NULL,
          run_type TEXT NOT NULL,
          run_time TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
          size_bytes INTEGER,
          status TEXT DEFAULT 'success' NOT NULL
        );

        -- Copy data from old table (handle both old and new column names)
        INSERT INTO backup_logs_new (id, file_uri, run_type, run_time, size_bytes, status)
        SELECT
          id,
          COALESCE(file_uri, location) as file_uri,
          CASE
            WHEN COALESCE(run_type, type) = 'automatic' THEN 'auto'
            ELSE COALESCE(run_type, type)
          END as run_type,
          COALESCE(run_time, timestamp, CURRENT_TIMESTAMP) as run_time,
          COALESCE(size_bytes, size) as size_bytes,
          COALESCE(status, 'success') as status
        FROM backup_logs;

        -- Drop old table
        DROP TABLE backup_logs;

        -- Rename new table
        ALTER TABLE backup_logs_new RENAME TO backup_logs;

        COMMIT;
      `);

      console.log('✅ Renamed backup_logs columns');
    } catch (error) {
      console.error('Error renaming backup_logs columns:', error);
      throw error;
    }
  }

  /**
   * Run all data migrations
   */
  static async runAll(): Promise<void> {
    if (isUsingMock()) {
      console.log('⏭️  Skipping data migration - using mock database');
      return;
    }

    console.log('🚀 Starting data migration to PRD-compliant schema...');

    try {
      const needsMigration = await this.needsMigration();

      if (!needsMigration) {
        console.log('✅ Database already uses PRD-compliant schema');
        return;
      }

      // Migrate journal entries
      const journalResult = await this.migrateJournalEntries();
      console.log(
        `📝 Journal entries: ${journalResult.migrated} migrated, ${journalResult.errors} errors`
      );

      // Migrate backup logs
      const backupResult = await this.migrateBackupLogs();
      console.log(
        `💾 Backup logs: ${backupResult.migrated} migrated, ${backupResult.errors} errors`
      );

      console.log('✅ Data migration completed successfully!');
    } catch (error) {
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  }
}
