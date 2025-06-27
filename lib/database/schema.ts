import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const journalEntries = sqliteTable('journal_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(), // YYYY-MM-DD format
  content: text('content').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const backupLogs = sqliteTable('backup_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  location: text('location').notNull(),
  type: text('type').notNull(), // 'manual' | 'automatic'
  timestamp: text('timestamp').default(sql`CURRENT_TIMESTAMP`).notNull(),
  size: integer('size'), // in bytes
  status: text('status').notNull().default('success'), // 'success' | 'failed'
});

export type JournalEntry = typeof journalEntries.$inferSelect;
export type NewJournalEntry = typeof journalEntries.$inferInsert;
export type BackupLog = typeof backupLogs.$inferSelect;
export type NewBackupLog = typeof backupLogs.$inferInsert;