# Code Review Report — Security, Performance & Correctness

**Project:** One Line Journal (React Native / Expo)
**Review date:** 2026-07-08
**Audience:** This report is written for an AI model (or developer) to implement the fixes. Each finding includes the exact location, why it is a problem, and step-by-step fix instructions. Findings are ordered by severity within each section. Fix Critical items first — several of them interact (see "Suggested fix order" at the end).

---

## CRITICAL

### C1. Save failures are silently swallowed — the app shows "Saved!" when the save failed

**Location:** `hooks/useAutoSave.ts:94-102` (`performSave` catch block), consumed by `app/(tabs)/index.tsx:103-121` (`handleManualSave`) and `app/entry/[date].tsx:115-159` (`handleSaveAndExit`, `handleManualSave`, back-button save at line 186-191).

**Problem:** `performSave` catches every error, stores it in state, and does **not** rethrow. `saveNow()` therefore always resolves successfully. Every caller wraps `await saveNow()` in `try/catch` and shows a success alert in the happy path — but the catch branches are dead code. If the database write fails, the user sees **"Saved! Your journal entry has been saved."**, the Today screen then advances `savedBodyRef` and **clears the editor** (`index.tsx:108-115`), permanently discarding the unsaved text. This is a direct data-loss path for a journaling app.

**Fix steps:**
1. In `useAutoSave.ts`, split behavior: the debounced background save may keep swallowing errors (it reports via `onSaveError`), but `saveNow()` must propagate failure. Simplest approach: give `performSave` a parameter `performSave(rethrow = false)`; in the catch block, after setting state and calling `onSaveError`, add `if (rethrow) throw error;`.
2. Call `performSave(true)` from `saveNow`, keep `performSave(false)` for the debounce timer.
3. Handle the early-return case too: when `isSavingRef.current` is true, `saveNow` currently returns immediately while marking a pending save. For `saveNow`, instead wait for the in-flight save to finish and then run again (or track the in-flight promise in a ref and `await` it), so manual save cannot resolve before the data is actually persisted.
4. In `index.tsx` `handleManualSave`, only advance `savedBodyRef`, set `hasSavedContent`, and clear the editor **after** `saveNow()` resolves without throwing. With step 1-3 done, the existing `try/catch` becomes live and correct.
5. Verify: temporarily make `DatabaseService.updateEntry` throw, tap Save, and confirm the error alert appears and the editor content is NOT cleared.

### C2. A full database backup (JSON serialize + ZIP + file write) runs on every save, including every 2-second auto-save

**Location:** `app/(tabs)/index.tsx:72` and `app/entry/[date].tsx:76` — `BackupService.createBackup()` is called inside `saveEntry`, which is the `onSave` of `useAutoSave` with `delay: 2000` and also fires on editor blur.

**Problem:** Every pause in typing triggers: read **all** journal entries from SQLite → `JSON.stringify` the entire journal → write a timestamped file → ZIP-compress it → write a `backup_logs` row. Consequences:
- **Storage leak:** each backup gets a unique filename (`journal-backup-<timestamp>.zip`, `services/backup.ts:84-87`) in the documents directory and is **never deleted**. A single writing session creates dozens of files; over months this fills device storage. (`backup_logs` rows also grow unboundedly.)
- **Performance/battery:** serialization + compression cost grows linearly with journal size and runs on the JS thread + native zip on every debounce tick.
- **UX:** if backup settings resolve to `share`, the system share sheet can pop up mid-typing (`backup.ts:139-146`).

**Fix steps:**
1. Remove the `BackupService.createBackup()` calls from `saveEntry` in both `app/(tabs)/index.tsx` and `app/entry/[date].tsx`. Saving an entry should only write to SQLite and update the widget.
2. Rely on the existing scheduled mechanisms for automatic backups: the background task (`services/task-manager.ts`) and/or `BackupService.autoBackup()` (which is rate-limited to 24h — but fix C3 first, it is currently broken). If an on-save safety net is desired, call `BackupService.autoBackup()` (the rate-limited entry point), not `createBackup()`.
3. Add retention to `BackupService.createBackup`: after writing a new backup, list `journal-backup-*` files in the documents directory, sort by name (timestamps sort lexicographically), and delete all but the newest N (suggest N = 5). Wrap deletion in try/catch so cleanup failure doesn't fail the backup.
4. Optionally cap `backup_logs` the same way (delete rows beyond the newest ~50).

### C3. `autoBackup()` reads a nonexistent field — automatic backups permanently stop after the first one

**Location:** `services/backup.ts:314` — `new Date(lastBackup[0].timestamp)`.

**Problem:** The `backup_logs` schema (`lib/database/schema.ts:16`) names the column `run_time`; `timestamp` was the *old* schema name and was explicitly migrated away (`lib/database/migrations/data-migration.ts`). `lastBackup[0].timestamp` is `undefined`, so `new Date(undefined).getTime()` is `NaN`, the `> 24h` comparison is `false`, and `shouldBackup` evaluates to `false` whenever any successful auto backup exists. Result: automatic backup runs once, then never again.

**Fix steps:**
1. Change `lastBackup[0].timestamp` to `lastBackup[0].run_time`.
2. Guard against invalid dates: `const last = new Date(lastBackup[0].run_time).getTime(); const shouldBackup = !lastBackup[0] || Number.isNaN(last) || now.getTime() - last > 24*60*60*1000;`
3. This bug existed because the row is untyped. Type the query result with `BackupLog` from the schema so field-name drift becomes a compile error.

### C4. Legacy `expo-file-system` API imported from the SDK 54 package — backup/restore/compression will fail at runtime

**Location:** `services/backup.ts:4`, `services/compression.ts:1`, `app/(tabs)/history.tsx:15` — all do `import * as FileSystem from 'expo-file-system'` and use `documentDirectory`, `cacheDirectory`, `writeAsStringAsync`, `readAsStringAsync`, `getInfoAsync`, `deleteAsync`, `copyAsync`, `makeDirectoryAsync`, `readDirectoryAsync`.

**Problem:** The project is on Expo SDK 54 (`expo ^54.0.11`, `expo-file-system@19.0.16` installed). In SDK 54 the package's default export is the **new** object-oriented API (`File`, `Directory`, `Paths`); the legacy functional API used throughout this codebase moved to the subpath `expo-file-system/legacy`. These calls will be `undefined` at runtime in a development/production build (masked today because the app runs in Expo Go mock mode and the backup path short-circuits).

**Fix steps:**
1. First verify against the installed package (I could not read `node_modules` under current permissions): check that `node_modules/expo-file-system/package.json` maps a `./legacy` export and that the root export no longer includes `documentDirectory`.
2. Minimal fix: change the three imports to `import * as FileSystem from 'expo-file-system/legacy';`.
3. Longer term, migrate to the new `File`/`Directory`/`Paths` API.
4. While there, update `CLAUDE.md`, which still says Expo SDK 53 / RN 0.79.1 / drizzle mock-mode notes — the repo is on SDK 54 / RN 0.81.4. Stale docs will keep misleading future automated changes.

### C5. `runMigrations` wraps a Drizzle instance in Drizzle again — schema migrations will crash in a real build

**Location:** `lib/database/client.ts:53` — `await migrate(drizzle(db), migrations);`

**Problem:** `db` is already the Drizzle instance created at line 25 (`drizzle(sqliteDb, { schema })`). Passing it to `drizzle()` again produces a broken instance; `migrate()` will fail as soon as the app runs outside mock mode, meaning tables are never created on a fresh install (dev client / production build). Note this file has uncommitted local modifications — fix on top of the current working-tree version.

**Fix steps:**
1. Replace with `await migrate(db, migrations);`.
2. Verify `drizzle/migrations.js` exists and is generated (`npx drizzle-kit generate`) — `require('../../drizzle/migrations')` at line 49 must resolve in the Metro bundle.
3. Test on a device/simulator with a development build (`npx expo run:android` or `run:ios`) on a fresh install: the app must create `journal_entries` and `backup_logs` and save a real entry.

### C6. Silent fallback to in-memory mock database in production = invisible data loss

**Location:** `lib/database/client.ts:29-34` (catch → mock mode) and `app/_layout.tsx:49-54` (init failure → `setDatabaseReady(true)` anyway).

**Problem:** If `openDatabaseSync` throws for any reason in a production build (disk full, transient native error), the app silently switches to mock data. The user can keep writing journal entries all day; everything is discarded on app close. `_layout.tsx` similarly swallows init/migration errors and proceeds. For a journaling app, silently pretending persistence works is the worst failure mode. Related: the "Demo Mode" warning banner in `app/(tabs)/index.tsx:169-175` is hardcoded to always render (comment: "Always show since we're always in mock mode"), so it is wrong in a real build and provides no signal in either direction.

**Fix steps:**
1. In `initializeDatabase`, only permit the mock fallback when `__DEV__` is true or when `Constants.executionEnvironment` indicates Expo Go (`expo-constants`, `ExecutionEnvironment.StoreClient`). In a production build, rethrow the error.
2. In `_layout.tsx`, when initialization/migration fails outside dev, render a blocking error screen ("Storage unavailable — your entries cannot be saved") instead of continuing with `databaseReady = true`.
3. In `app/(tabs)/index.tsx`, gate the warning banner on `isUsingMock()` (already imported at line 10) instead of rendering unconditionally.

---

## SECURITY

### S1. Backup restore inserts unsanitized HTML that is later rendered in WebViews (stored XSS surface)

**Location:** `services/backup.ts:258-272` (`restoreFromBackup` insert loop). Rendering sinks: `components/organisms/RichTextEditor.tsx` (pell rich editor — a WebView **with JavaScript enabled**, content injected via `initialContentHTML` / `setContentHTML`), `components/molecules/HistoryCard.tsx:80-88` (raw `entry.html_body` interpolated into a WebView document), `app/entry/[date].tsx:248-252` (`RenderHtml`).

**Problem:** Restore accepts any user-selected JSON file and inserts `entry.html_body` (or legacy `entry.content`) into the database with zero validation or sanitization. A crafted backup file containing `<script>…</script>`, `<img src=x onerror=…>`, or `<iframe src=…>` executes when the entry is opened in the editor WebView (JS enabled) and can exfiltrate the entire journal (the WebView content includes it) or navigate to attacker pages. `HistoryCard` sets `javaScriptEnabled={false}` (good) but uses `originWhitelist={['*']}`. This is the app's main untrusted-input boundary.

**Fix steps:**
1. Add a sanitizer function (e.g. in `utils/html.ts`) that allowlists only the tags the editor can produce — `p, br, b, strong, i, em, u, h1, h2, ul, ol, li, div, span` — and strips **all** attributes (the editor's output doesn't need any). Use an iterative strip loop or a small dependency like `sanitize-html` configured with that allowlist; do not use a single-pass regex (bypassable with nested/malformed tags).
2. In `restoreFromBackup`, for each entry before insert: (a) validate `entry_date` matches `/^\d{4}-\d{2}-\d{2}$/`, (b) require `html_body` to be a string, cap its length (e.g. 100 KB), (c) run it through the sanitizer. Skip and count invalid entries instead of inserting them.
3. In `HistoryCard.tsx`, change `originWhitelist={['*']}` to `originWhitelist={['about:blank']}` and add `onShouldStartLoadWithRequest={() => false}` so tapped links/navigation are blocked. Better (also fixes P1): drop the WebView entirely and render `createTextPreview(entry.html_body)` (already available in `utils/html.ts`) in a `<Text>`.
4. Defense in depth: apply the same sanitizer when displaying via `RenderHtml` in `entry/[date].tsx` (RenderHtml doesn't execute scripts, but sanitizing centrally keeps one trust boundary).

### S2. Restore has no version/shape validation and a crash bug for compressed backups; failure is reported after data was already written

**Location:** `services/backup.ts:210-288`.

**Problems:**
1. `new Blob([backupData]).size` at line 279 runs even when the compressed path was taken, where `backupData` is not the JSON (callers would pass a file path or `undefined`) — this can throw **after** entries were inserted, so the user sees "Failed to restore" for a restore that actually happened (and may retry, compounding).
2. `data.entries` items are trusted wholesale (see S1); `entry_date: undefined` would throw NOT NULL per row and be miscounted as "already exists".
3. Row-by-row inserts without a transaction: a large restore is slow and can be half-applied if interrupted.
4. The UI restore flow (`app/(tabs)/history.tsx:198-206`) only accepts `.json`, but backups are created as `.zip` by default (`compress: true` default in `getBackupSettings`) — users cannot restore their own default backups.

**Fix steps:**
1. Compute the logged size from the parsed/derived JSON string actually restored (or the file's `getInfoAsync().size`), not from the `backupData` parameter.
2. Validate shape up front: `data.version`, `Array.isArray(data.entries)`, per-entry validation per S1 step 2.
3. Wrap the insert loop in a single transaction (drizzle: `db.transaction(...)` or `sqliteDb.withTransactionAsync`).
4. In `history.tsx` `selectRestoreFile`, accept `application/zip` too; when the picked file ends in `.zip` (use `CompressionService.isCompressed`), call `restoreFromBackup('', true, uri)` — and change `restoreFromBackup`'s signature to make the compressed/uncompressed input explicit (e.g. accept `{ json?: string; zipPath?: string }`) so the current undefined-parameter trap disappears.

### S3. Journal content and backups are stored/exported unencrypted

**Location:** `journal.db` (expo-sqlite, `lib/database/client.ts:24`), backup JSON/ZIP files in the documents directory (`services/backup.ts`), widget preview in AsyncStorage (`services/widget.ts:68`), Android widget SharedPreferences (`widgets/android/.../JournalWidgetProvider.kt:96-100`).

**Problem:** All journal text is plaintext at rest. Inside the app sandbox this is an accepted-risk default for many apps, but backups are also **exported** (share sheet → cloud drives, messaging apps) as plaintext ZIP/JSON, and they contain the entire journal. This is a privacy product decision, not a one-line fix — flagged so it's deliberate.

**Fix steps (choose deliberately):**
1. Minimum: warn the user in the share dialog title/UI that the export is unencrypted.
2. Better: offer password-protected export (e.g. `react-native-zip-archive` supports `zipWithPassword`) and require a password for restore.
3. Optional hardening: SQLCipher via `expo-sqlite`'s SQLCipher support for the local DB.

### S4. Widget `escapeHtml` exists and is used correctly, but HTML entity decoding is wrong in both plain-text converters (correctness with security flavor)

**Location:** `utils/html.ts:20-25` and `services/widget.ts:31-35`.

**Problem:** Both decoders replace `&amp;` **before** `&lt;`/`&gt;`, so `&amp;lt;` double-decodes to `<`. For previews this is mild, but text that round-trips through these previews can smuggle angle brackets past naive assumptions.

**Fix steps:** In both functions, decode `&amp;` **last** (after `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`).

---

## PERFORMANCE

### P1. One full WebView per history card, inside a non-virtualized list, fed by an unpaginated full-table query

**Location:** `components/molecules/HistoryCard.tsx:80-88` (WebView per card); `app/(tabs)/history.tsx` renders cards in a `ScrollView`; `services/database.ts:160-183` (`getAllEntries` selects every row incl. full HTML bodies).

**Problem:** Each `WebView` is a full native browser view (tens of MB each, expensive init). Rendering the All-entries tab with a year of entries creates hundreds of WebViews at once, with the entire table (all HTML bodies) held in JS memory. This will visibly hang and can OOM on low-end Android as the journal grows.

**Fix steps:**
1. In `HistoryCard`, replace the WebView with `createTextPreview(entry.html_body, 150)` from `utils/html.ts` rendered in a `<Text numberOfLines={3}>`. (This also resolves S1 step 3 for this component.) Keep rich rendering only on the detail screen.
2. In `history.tsx`, render entries with a `FlatList` (virtualized) instead of mapping inside a `ScrollView`.
3. Add pagination to the data layer: give `getAllEntries` `limit`/`offset` params (e.g. 50 per page) and load more via `onEndReached`. Optionally add a projection variant that selects only `id, entry_date` plus a DB-side substring of `html_body` for previews so full bodies never load for the list.

### P2. Backup work on the save hot path

Covered by C2 — listed here for completeness because it is also the single largest performance issue.

### P3. Background backup retry can blow the OS background-time budget

**Location:** `services/task-manager.ts:71-100` — 3 attempts × 5 s sleep between attempts, each attempt performing serialize+zip.

**Problem:** iOS background fetch gives ~30 s. Two failures already spend 10 s sleeping plus 3 full backup attempts; exceeding the budget gets the app throttled or killed, making the "reliability" retry counterproductive.

**Fix steps:** Reduce to 2 attempts with a 1–2 s delay, or retry without sleeping. Never sleep in a background task on iOS.

### P4. `getEntryCount` misses the null-db guard

**Location:** `services/database.ts:266-282`. `getDatabase()` result is used without the `if (!db)` check every other method has; in mock-fallback edge cases this throws and is caught, but make it consistent: add the guard, return 0.

---

## CORRECTNESS / MAINTENANCE

### M1. Two divergent settings systems fight over backup behavior

**Location:** `services/settings.ts` (`@app_settings`: `autoBackupFrequency`, `lastBackupTime`, `backupDestination`, `characterLimit`) vs. `services/backup.ts:33-49` + `app/(tabs)/history.tsx:53-72` (`backupSettings` AsyncStorage key: `location`, `autoBackup`, `compress`).

**Problem:** The Settings screen toggles auto-backup via `SettingsService`/`TaskManagerService`, but `BackupService.autoBackup()` decides based on the *other* store's `autoBackup` flag (default `true`). A user who never touched the History-screen backup modal has `autoBackup: true` there even if they set frequency "off" in Settings (the background task checks frequency, but any direct `autoBackup()` caller doesn't). `backupDestination` picked in Settings (`settings.tsx:98-126`) is written to `@app_settings` and **never read by BackupService**; worse, it's derived by string-slicing a `content://` document URI (`settings.tsx:115-116`), which is not a usable directory path on Android SAF.

**Fix steps:**
1. Make `SettingsService` the single source of truth: move `location`/`compress` into `AppSettings`, and have `BackupService.getBackupSettings()` read via `SettingsService`.
2. Delete the duplicated `BackupSettings` handling in `history.tsx` and point its modal at `SettingsService`.
3. Remove or properly implement the backup-destination picker: on Android use Storage Access Framework directory permissions (`FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync` in the legacy API) and store the granted directory URI; until then, drop the misleading setting.

### M2. Character limit setting is stored but never enforced, and the editor's enforcement is broken anyway

**Location:** `app/(tabs)/index.tsx:219-232` (no `characterLimit` prop passed); `app/entry/[date].tsx:257-268` (same); `components/organisms/RichTextEditor.tsx:98-115` (`handleChange`).

**Problem:** The Settings screen lets users configure a 100–10,000 character limit that nothing uses. Additionally, `RichTextEditor`'s enforcement strategy — "don't call `onChange` when over limit" — desynchronizes state from the editor: the WebView keeps displaying everything the user typed, but React state (and therefore what gets saved) is frozen at the last under-limit snapshot. The user sees text that silently won't be saved.

**Fix steps:**
1. Load `characterLimit` via `SettingsService.getSetting('characterLimit')` in both editor screens and pass it as the `characterLimit` prop.
2. In `RichTextEditor.handleChange`, when over the limit, still call `onChange` (keep state truthful) and rely on the existing over-limit visual indicator; block **saving** over-limit content in the save handlers with a clear alert. (Truncating inside the editor via `setContentHTML` mid-typing causes cursor jumps; validating at save time is the reliable approach for pell-rich-editor.)

### M3. Today screen date goes stale past midnight

**Location:** `app/(tabs)/index.tsx:27` — `const today = getTodayString()` captured at first render; `todayEntry`/`savedBodyRef` cached from mount.

**Problem:** If the app sits open (or backgrounded and resumed) across midnight, new notes are appended to yesterday's entry. For a daily-journal app this is a likely real-world occurrence (writing at 23:58).

**Fix steps:** On `AppState` change to `active` (and/or via `useFocusEffect`), recompute `getTodayString()`; if it differs from the loaded date, reset state (`todayEntry`, `savedBodyRef`, editor content) by re-running `loadTodayEntry` for the new date.

### M4. `calendar.tsx` dead/broken selected-entry path

**Location:** `app/(tabs)/calendar.tsx:212-217` — `navigateToEntry(selectedEntry.date)`.

**Problem:** `JournalEntry` has no `date` property (it's `entry_date`), so this would navigate to `/entry/undefined`. Currently unreachable (`selectedEntry` is only ever set to `null` — `handleDateSelect` navigates directly instead), but it's a landmine.

**Fix steps:** Either remove `selectedEntry` and the `<HistoryCard>` branch entirely (dead code), or set `selectedEntry` in `handleDateSelect` and fix the property to `selectedEntry.entry_date`.

### M5. Permission re-check race in Settings auto-backup toggle

**Location:** `app/(tabs)/settings.tsx:137-143`.

**Problem:** After `await backgroundPermissions.requestPermission()`, the code immediately reads `backgroundPermissions.isEnabled` — a React state value captured at render time, which cannot reflect the just-granted permission. Granting the permission still returns early ("don't enable") until the next render.

**Fix steps:** Have `requestPermission()` return the fresh status (boolean) and branch on the returned value, not on state.

### M6. `DataMigration.renameJournalColumns` / `renameBackupLogColumns` use `db.exec` with a multi-statement script

**Location:** `lib/database/migrations/data-migration.ts:149-178, 276-310`.

**Problem:** The Drizzle expo-sqlite instance exposes `run`/`all`/`get`/`values` for raw SQL — `db.exec` is not part of that API, and expo-sqlite's single-statement runners won't execute a multi-statement `BEGIN…COMMIT` script. If this path is ever hit (old-schema database), it throws, and because `runAll()` rethrows, app startup fails. If no shipped build ever used the old column names, prefer deleting this migration code entirely; dead migration paths that crash are worse than none.

**Fix steps (if keeping):**
1. Get the raw expo-sqlite handle (store it from `openDatabaseSync` in `client.ts` and export a getter) and use `execAsync` (which does support multi-statement scripts), or split into individual `db.run(sql\`…\`)` statements wrapped in a transaction.
2. Add a test with a fixture DB using old column names.

### M7. Documentation drift (CLAUDE.md)

`CLAUDE.md` states Expo SDK 53, RN 0.79.1, and describes mock mode as the current behavior without mentioning the SDK 54 file-system API split. Update the Key Technologies and Development Notes sections after C4/C6 land, so future automated edits aren't misled.

---

## Suggested fix order

1. **C1** (error propagation) — prerequisite for trusting any save-path testing.
2. **C5 → C4 → C6** (migrations, file-system imports, mock fallback) — these make the real-database build actually work; everything else should be verified against a dev build, not Expo Go.
3. **C2 + C3** (backup on save, autoBackup field) — do together; C2 removes the hot-path calls, C3 makes the scheduled path functional. Add retention in the same pass.
4. **S1 + S2** (restore validation/sanitization + compressed-restore fixes) — one coherent change to `restoreFromBackup` and `HistoryCard`.
5. **P1** (history list) and **M1/M2** (settings unification, character limit).
6. Remaining M-items and S3/S4 as follow-ups.

**Verification checklist after fixes:** fresh install on a dev build creates the schema and persists an entry across restart; typing for 60 seconds produces zero `journal-backup-*` files; a failed DB write shows an error and does not clear the editor; restoring a `.zip` backup produced by the app succeeds; restoring a JSON file containing `<script>` renders inert text; History tab with 200+ entries scrolls smoothly.
