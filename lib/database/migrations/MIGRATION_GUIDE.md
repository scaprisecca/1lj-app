# Database Migration Guide

## Overview

This app's database schema has been updated to match the PRD specification exactly. The migration system handles both:
1. **Schema migrations** - Creating new tables with correct structure
2. **Data migrations** - Converting old field names to new PRD-compliant names

## Schema Changes

### journal_entries Table

| Old Field Name | New Field Name | Type     | Notes                    |
| -------------- | -------------- | -------- | ------------------------ |
| `date`         | `entry_date`   | TEXT     | YYYY-MM-DD format        |
| `content`      | `html_body`    | TEXT     | HTML from rich editor    |
| `createdAt`    | `created_at`   | DATETIME | ISO timestamp            |
| `updatedAt`    | `updated_at`   | DATETIME | ISO timestamp            |

### backup_logs Table

| Old Field Name | New Field Name | Type     | Notes                           |
| -------------- | -------------- | -------- | ------------------------------- |
| `location`     | `file_uri`     | TEXT     | File path or URI                |
| `type`         | `run_type`     | TEXT     | 'manual' or 'auto'              |
| `timestamp`    | `run_time`     | DATETIME | ISO timestamp                   |
| `size`         | `size_bytes`   | INTEGER  | File size in bytes              |

**Additional Changes:**
- `run_type` value: `'automatic'` is converted to `'auto'` to match PRD spec

## Migration Process

### Automatic Migration

The app automatically runs migrations on startup:

1. **Schema Migration** (`drizzle/0000_flashy_dagger.sql`)
   - Creates tables with new PRD-compliant structure
   - Runs via Drizzle ORM's migration system

2. **Data Migration** (`lib/database/migrations/data-migration.ts`)
   - Detects old field names in existing data
   - Copies data from old columns to new columns
   - Renames columns to match PRD specification
   - Handles both camelCase and snake_case variants

### Migration Entry Point

Migrations are triggered in `app/_layout.tsx`:

```typescript
initializeDatabase()
  .then(async () => {
    // Run schema migrations
    await runMigrations();

    // Run data migration
    await DataMigration.runAll();

    setDatabaseReady(true);
  })
```

## Backward Compatibility

### Reading Data

The `DataMigration` class handles backward compatibility by:

1. Checking if old columns exist using `PRAGMA table_info`
2. Reading from both old and new column names using `COALESCE`:
   ```sql
   COALESCE(entry_date, date) as entry_date
   ```
3. Converting old values to new format (e.g., 'automatic' → 'auto')

### Writing Data

All new data is written using the new PRD-compliant field names:
- `entry_date`, `html_body`
- `file_uri`, `run_type`, `run_time`, `size_bytes`

### Backup/Restore Compatibility

The `BackupService` (`services/backup.ts`) supports both old and new field names during restore:

```typescript
await db.insert(journalEntries).values({
  entry_date: entry.entry_date || entry.date,
  html_body: entry.html_body || entry.content,
  // ...
});
```

This ensures backups created with old schema can be restored in new schema.

## Testing Migration

### Test Scenarios

1. **Fresh Install** (New Users)
   - Schema created with new structure
   - No data migration needed
   - ✅ Works in current mock mode

2. **Existing Data with Old Schema**
   - Old columns detected
   - Data copied to new columns
   - Old columns renamed
   - ⚠️ Cannot test in mock mode (requires real SQLite)

3. **Mixed Schema** (Partial Migration)
   - Some entries have old field names, some have new
   - `COALESCE` handles both
   - All data preserved during migration

### Manual Testing Steps

When SQLite is enabled (in production build):

1. Create test data with old schema
2. Run app with migration code
3. Verify:
   - All data preserved
   - New field names used
   - No duplicate entries
   - Backup/restore works

### Mock Mode (Current State)

The app currently runs in mock mode for Expo Go compatibility:
- Schema changes are ready in `schema.ts`
- Migrations are ready but skip in mock mode
- All services use new field names
- Production build will run migrations automatically

## Troubleshooting

### Migration Fails

If migration fails, the app logs errors and continues with mock database for development.

Check logs for:
```
❌ Migration failed: [error message]
```

### Data Loss Prevention

The migration uses SQLite transactions:
```sql
BEGIN TRANSACTION;
-- migration steps
COMMIT;
```

If any step fails, the entire migration is rolled back.

### Manual Rollback

If needed, restore from backup created before migration:
1. App automatically creates backup before first migration
2. Use Settings → Import Backup
3. Select pre-migration backup file

## Future Migrations

When adding new fields or tables:

1. Update `lib/database/schema.ts`
2. Run `npx drizzle-kit generate` to create migration
3. Test in production build with real SQLite
4. Document changes in this file

## References

- PRD Data Model: `build-plan/prd.md` (Section 4)
- Schema Definition: `lib/database/schema.ts`
- Migration Files: `drizzle/` directory
- Data Migration: `lib/database/migrations/data-migration.ts`
