import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const journalEntries = sqliteTable('journal_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entry_date: text('entry_date').notNull().unique(), // YYYY-MM-DD format (PRD spec)
  html_body: text('html_body').notNull(), // HTML content from rich text editor (PRD spec)
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updated_at: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const backupLogs = sqliteTable('backup_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  file_uri: text('file_uri').notNull(), // PRD spec: file_uri instead of location
  run_type: text('run_type').notNull(), // PRD spec: 'auto'|'manual' instead of 'manual'|'automatic'
  run_time: text('run_time').default(sql`CURRENT_TIMESTAMP`).notNull(), // PRD spec: run_time instead of timestamp
  size_bytes: integer('size_bytes'), // PRD spec: size_bytes instead of size
  status: text('status').notNull().default('success'), // Keep existing: 'success' | 'failed'
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type BackupLog = typeof backupLogs.$inferSelect;
export type NewBackupLog = typeof backupLogs.$inferInsert;