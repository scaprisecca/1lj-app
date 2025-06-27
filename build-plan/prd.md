**Product-Requirements Document (PRD) – “1 Line Journal”**
*(Expo + React Native – v1 scope with v2 roadmap)*

---

### 1. Vision & Goals

| Goal                                                  | Measure of Success                                                               |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Reduce journaling friction to a single sentence a day | ≥ 40 DAU after 60 days with no more than 30 sec median time-in-app               |
| Help users surface memories easily                    | ≥ 60 % of weekly active users open **This Day in the Past** at least once a week |
| Provide bullet-proof local data ownership             | 0 unresolved “lost data” tickets; ≥ 90 % of users enable automatic backups       |

---

### 2. Versioning Strategy

| Version                     | High-level Feature Set                                                                                                                                                              | Rationale                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **v1 (MVP)**                | offline-first; rich-text 1-line entry; calendar & “This Day” views; on-device SQLite; on-device file-backup; Android/iOS quick-add widgets                                          | Confirms core habit loop, no sign-in friction |
| **v2** (extensible roadmap) | cloud provider back-ups + sync; passcode / Face ID lock & at-rest encryption; photo & file attachments; web client (Expo web target); markdown export; advanced analytics & streaks | Builds lock-in, multiplatform reach, privacy  |

> **Architectural principle:** every new object (e.g., attachment) lives in its own table / module with foreign keys so versions can evolve independently.

---

### 3. Tech Stack Decisions

| Area             | Choice                                                                                                                                                                           | Notes                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework        | **Expo SDK 52** with React Native Router                                                                                                                                         | Enables OTA updates; Router provides nested platform targets.                                                 |
| Data             | **expo-sqlite (wrapped by Drizzle ORM)**                                                                                                                                         | Simple schema migration; good perf.                                                                           |
| Rich text        | **`react-native-pell-rich-editor`** for WYSIWYG (stores HTML string)                                                                                                             | Works in Expo (pure JS + WebView) and supports bold/italic/underline out-of-the-box. ([geeksforgeeks.org][1]) |
| Back-ups         | **expo-file-system** → zipped SQLite file; “Export Now” or periodic cron via `expo-task-manager`.                                                                                |                                                                                                               |
| Widgets          | **Expo “target” templates (`npx create-target widget`)** – Widgets compiled with WidgetKit / GlanceApp for iOS, AppWidget on Android. ([linkedin.com][2], [dev.to][3])           |                                                                                                               |
| Attachments (v2) | Images stored in app’s document directory; DB holds URI + metadata (thumb path, created\_at). Avoid BLOBs to keep DB small. ([stackoverflow.com][4], [developer.android.com][5]) |                                                                                                               |
| CI/CD            | EAS Build & Submit; EAS Update for OTA; GitHub Actions.                                                                                                                          |                                                                                                               |

---

### 4. Data Model (v1)

```mermaid
erDiagram
  journal_entry {
    id          integer PK
    entry_date  text  "YYYY-MM-DD" UNIQUE
    html_body   text      "1 line (may grow)"
    created_at  datetime
    updated_at  datetime
  }

  backup_log {
    id          integer PK
    file_uri    text
    run_type    text  "auto|manual"
    run_time    datetime
    size_bytes  integer
  }
```

*Future v2 tables:* `attachment`, `user_pref`, `cloud_account`, `passcode_setting`.

---

### 5. Functional Requirements (v1)

| #   | Epic / Screen            | Requirement                                                                                                                                                                       |       |                                                        |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------ |
| F-1 | **Home**                 | Show today’s *entry\_date* header (`MMMM Do, YYYY`).<br>Rich-text editor limited to 140 characters (configurable).<br>Save on blur or toolbar **Save** tap.                       |       |                                                        |
| F-2 | **Widget – Quick Add**   | 1×1 widget (Android & iOS). Shows today’s entry (truncated). Tapping the *“+”* field opens inline text field; on submit, appends text with timestamp (`HH:mm`) separated by `\n`. |       |                                                        |
| F-3 | **This Day in the Past** | Query all entries where `entry_date LIKE '%-MM-DD'` ordered DESC by year. Display block per year.                                                                                 |       |                                                        |
| F-4 | **Calendar**             | Month grid (react-native-calendars). Days with entries are bold-dotted. Tap day → **EntryDetails** (read-only with edit pencil).                                                  |       |                                                        |
| F-5 | **Settings**             | Backup destination picker (expo-file-system `documentDirectory` default).<br>\`Auto Backup: Off                                                                                   | Daily | Weekly`.<br>`Export Now\` triggers compression & copy. |
| F-6 | **Storage**              | Local writes must be atomic (transaction) and throttled to avoid locks.                                                                                                           |       |                                                        |

---

### 6. Non-Functional Requirements

* **Performance:** First cold start < 1 s; DB ops < 10 ms on mid-range Android.
* **Offline:** 100 % features work airplane-mode.
* **Accessibility:** WCAG AA; dynamic font sizes.
* **Security:** No network I/O in v1.
* **Extensibility:** All business logic lives in separate *domain* folder; UI uses atomic component library (e.g., Tamagui or NativeWind) so new screens can mount quickly.

---

### 7. User Stories (v1 selection)

1. *As a busy professional,* I open the widget at 9 pm, jot a single line, and close my phone < 15 s later.
2. *As a nostalgic user,* I browse June 26 on the “This Day” screen and reminisce about last year’s trip.
3. *As a cautious user,* I enable weekly automatic backups to my Downloads folder so I never lose data if I upgrade phones.

---

### 8. Future Roadmap (v2)

| Feature                     | Brief Notes                                                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloud Sync & Sign-in**    | OAuth flow (Google, Apple). Use Supabase or Firebase Firestore <–> local sync queue.                                                                                  |
| **Cloud Back-up Providers** | User chooses Google Drive, iCloud Drive, Dropbox; integrate with platform file-picker APIs for folder selection. (Feasible via native modules / Expo config plugins.) |
| **Attachments**             | Add image picker & inline preview; files saved in filesystem; optional compression; DB stores URI + `md5` hash for deduping.                                          |
| **App Lock**                | Passcode screen + biometric prompt (`expo-local-authentication`). Encrypted SQLite using `expo-sqlite-crypto` or SQLCipher.                                           |
| **Streaks & Analytics**     | Track consecutive days; sparkline in widget.                                                                                                                          |
| **Web Client**              | Expo web target; same DB via IndexedDB; optional cross-device sync once cloud layer exists.                                                                           |

---

### 9. Open Risks / Mitigations

| Risk                                                     | Impact                        | Mitigation                                                                  |
| -------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| Widgets require native targets, not available in Expo Go | Slower iteration              | Use EAS Dev Client + `create-target` widgets; document extra build steps.   |
| Rich-text HTML in DB vs plaintext                        | Data bloat (≈ 20-30 % larger) | Acceptable for 365 small records/year; evaluate compressing body on export. |
| Large photo attachments could exceed sandbox quota       | Crash / failed writes         | Force 2 MB jpeg max & warn user; allow external SD path on Android.         |

---

### 10. Acceptance Criteria (v1 “Definition of Done”)

* Create / edit / delete today’s entry with rich text toolbar.
* Widget text goes straight into today’s entry and is visible in app immediately.
* “This Day in the Past” shows at least three years of seeded test data correctly ordered.
* Manual export produces a `.zip` containing `journal.db` and places it in selected folder.
* Enabling automatic daily back-ups writes a new file within 24 h without user interaction.
* All Jest + Detox E2E tests pass; coverage ≥ 80 %.

---

### 11. Handoff Notes for AI Coding Assistant

* Use TypeScript strict mode.
* Follow atomic design (Atoms → Molecules → Screens).
* Keep **DB schema** in `/src/data/schema.ts`; migrations via Drizzle DX.
* Rich-text editor wrapped as `<JournalEditor value={html} onChange={setHtml} />`.
* Widget code lives in `/widgets/QuickAdd` with shared utils in `/widgets/common`.
* Place feature flags (`/src/config/features.ts`) so v2 items can toggle-on without refactor.

---
