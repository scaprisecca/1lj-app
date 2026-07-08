# UI/UX Improvement Plan — One Line Journal

This document is an implementation task list for an AI coding assistant (Claude Sonnet).
Each item lists the problem, the exact file/location, and what to implement. Work through
items in priority order (P1 → P3). Items are independent unless a dependency is noted.

Conventions for the implementer:
- Follow existing code style: functional components, TypeScript strict, StyleSheet.create.
- Primary palette in use: indigo `#6366F1` → violet `#8B5CF6`, slate grays (`#1E293B`, `#64748B`, `#94A3B8`), background `#F8FAFC`.
- Run `npm run lint` after changes.

---

## P1 — Broken or misleading interactions (fix first)

### 1.1 History cards do nothing when tapped
- **Where:** `app/(tabs)/history.tsx:424` and `history.tsx:449`
- **Problem:** `onPress={() => console.log('Edit entry:', entry.id)}` — tapping an entry
  card only logs to the console. Users cannot open or edit past entries from the History
  screen, which is its core purpose.
- **Fix:** Import `useRouter` from `expo-router` and navigate with
  `router.push(`/entry/${entry.entry_date}`)` for both the "All Entries" and "This Day"
  lists (same pattern as `calendar.tsx:85-87`).

### 1.2 Wrong field name breaks calendar entry card and streak stat
- **Where:** `app/(tabs)/calendar.tsx:215` (`selectedEntry.date`) and
  `app/(tabs)/history.tsx:407` (`entries[entries.length - 1].date`)
- **Problem:** The schema field is `entry_date`, not `date`. The calendar card press
  handler would navigate to `/entry/undefined`, and the History "Day Streak" stat computes
  from `undefined` (renders `NaN` or a garbage number).
- **Fix:** Use `entry.entry_date` in both places. Also see 2.6 — the streak formula itself
  is wrong.

### 1.3 "Day Streak" stat is not a streak
- **Where:** `app/(tabs)/history.tsx:406-409`
- **Problem:** The value shown is days elapsed since the oldest entry, not consecutive
  days journaled. A user who wrote once a year ago sees "365 Day Streak".
- **Fix:** Compute a real streak: walk back from today (or yesterday, to be forgiving)
  through `entry_date` values, counting consecutive calendar days that have entries. Put
  the helper in `lib/utils/date.ts` with a unit-testable signature like
  `calculateStreak(dates: string[], today: string): number`.

### 1.4 Demo-mode warning banner is hardcoded to always show
- **Where:** `app/(tabs)/index.tsx:169-175`
- **Problem:** The banner claims data won't persist even when the real SQLite database is
  active. `isUsingMock` is already imported (`index.tsx:10`) but never used. The banner
  also permanently eats vertical space on the primary writing screen.
- **Fix:** Render the banner only when `isUsingMock` is true. Shorten the copy to one
  line (e.g. "Demo mode — data won't persist. Use a development build for full
  functionality.") and drop the 🚀 emoji, which contradicts the warning tone.

### 1.5 Calendar tap behavior is inconsistent and has a dead code path
- **Where:** `app/(tabs)/calendar.tsx:68-78` and `calendar.tsx:200-236`
- **Problem:** Tapping a day with an entry navigates away instantly; tapping an empty day
  reveals a "Create Entry" section below the fold. `selectedEntry` is set in state but
  never populated with an entry (the entry branch navigates away first), so the
  `<HistoryCard>` branch at `calendar.tsx:212-217` is unreachable dead code. Instant
  navigation also gives no chance to preview or cancel.
- **Fix (pick one consistent model and implement it):** On any day tap, select the date
  and show the inline panel: if an entry exists, populate `selectedEntry` and render the
  `HistoryCard` (which navigates on tap); if not, show the existing "Create Entry" CTA.
  Never auto-navigate on the first tap. Remove the now-obsolete instant `router.push` in
  `handleDateSelect`. Consider auto-scrolling the panel into view via a `ScrollView` ref.

---

## P2 — High-impact UX improvements

### 2.1 Replace success `Alert.alert` popups with a non-blocking toast
- **Where:** `index.tsx:116` ("Saved!"), `entry/[date].tsx:121` and `:151`,
  `history.tsx:157` and `:224`, `settings.tsx:121` and `:197-210`
- **Problem:** Modal alerts for routine success are heavy friction — every save
  interrupts writing flow with a dialog that must be dismissed. The Today screen already
  has an inline "Saved just now" indicator, so the alert is redundant there.
- **Fix:** Create `components/atoms/Toast.tsx` — a small animated banner (fade/slide in
  near the bottom, auto-dismiss ~2s, `Animated` API, no external deps) plus a
  `useToast()` hook or simple module-level trigger. Replace all *success* alerts with
  toasts. Keep `Alert.alert` for errors and destructive confirmations (those genuinely
  need acknowledgment).

### 2.2 Today screen hides what you already wrote today
- **Where:** `app/(tabs)/index.tsx` (whole screen); note append logic at
  `index.tsx:60-62` and `:109-114`
- **Problem:** After saving, the editor clears and the only trace of existing content is
  the subtitle "You have notes today — add more below". Users can't see, review, or edit
  what they wrote earlier today without going to Calendar → entry. The append-only model
  is invisible to the user.
- **Fix:** When `hasSavedContent` is true, render a compact read-only preview of
  `savedBodyRef.current` above the editor (reuse the `RenderHtml` approach from
  `entry/[date].tsx:248-252`, capped height ~120 with a subtle fade or "View full entry"
  link that pushes `/entry/${today}`). This makes the append model legible and gives
  one-tap access to edit today's full entry.

### 2.3 HistoryCard: replace per-card WebView with native HTML rendering
- **Where:** `components/molecules/HistoryCard.tsx:80-88`
- **Problem:** Every card instantiates a full `WebView` to render an entry preview. This
  is very expensive (History renders one per entry in a ScrollView), the fixed
  `height: 80` clips content with no affordance, and the WebView can swallow tap gestures
  meant for the parent `TouchableOpacity`.
- **Fix:** Replace the WebView with `react-native-render-html` (already a dependency,
  used in `entry/[date].tsx`). Cap the preview: wrap in a `View` with `maxHeight` and
  `overflow: 'hidden'`, or better, strip HTML to plain text (a `stripHtml` helper likely
  exists in `utils/html.ts` — check; otherwise add one) and show 3 lines via
  `numberOfLines={3}` on a `Text`. Plain-text preview is the recommended option: cheaper,
  uniform card heights, and ellipsis for free.

### 2.4 History screen: use FlatList and move backup actions out
- **Where:** `app/(tabs)/history.tsx:378-457` (ScrollView + `.map`) and `:459-505`
  (backup bar)
- **Problem:** All entries render eagerly in a ScrollView — jank once the journal grows.
  The persistent 3-button backup bar (Backup / Restore / Settings) steals ~70px from the
  reading area and duplicates functionality that belongs to the Settings tab. The
  `BackupSettingsModal` here stores settings in AsyncStorage key `backupSettings`,
  while the Settings tab uses `SettingsService` — two sources of truth.
- **Fix:**
  1. Convert entry lists to `FlatList` (stats/header as `ListHeaderComponent`,
     `RefreshControl` preserved).
  2. Delete the backup bar, the `BackupSettingsModal`, and all backup/restore
     state/handlers from `history.tsx`. Move the Restore flow (`handleRestore`,
     `selectRestoreFile`, `processRestoreFile`) into `settings.tsx` under the
     "Backup & Export" section as a "Restore from Backup" card, since Settings currently
     has export but no restore.
  3. Ensure only `SettingsService` persists backup preferences.

### 2.5 Add search to History
- **Where:** `app/(tabs)/history.tsx`
- **Problem:** The only way to find an old entry is scrolling the full list.
- **Fix:** Add a search `TextInput` (with `Search` icon from lucide, clear button) above
  the list on the "All Entries" tab. Filter client-side on the plain-text content of
  `html_body` (reuse the strip-HTML helper from 2.3) and on the formatted date. Debounce
  ~200ms. Show "No entries match "query"" empty state. (Do after 2.3/2.4.)

### 2.6 Calendar month/year navigation and stats polish
- **Where:** `app/(tabs)/calendar.tsx`
- **Problems / fixes:**
  1. **Month picker:** The header dropdown only picks a year (`calendar.tsx:256-284`).
     Add a month grid (Jan–Dec, 3×4) to the same modal above/beside the year list so a
     user can jump to "March 2023" in one visit.
  2. **Completion % counts future days** (`calendar.tsx:248`): for the current month,
     divide by days elapsed so far, not days in the month; label it "Days journaled" if
     clearer.
  3. **Layout shift:** The "Today" pill (`calendar.tsx:177-182`) appears/disappears,
     nudging the grid. Reserve its space (render with `opacity: 0` and disabled when on
     the current month) or move it into the header row.
  4. **Swipe navigation:** Add left/right swipe on the calendar card to change months
     (`react-native-gesture-handler` is available in Expo SDK 53 projects; verify in
     package.json first, otherwise use a simple `PanResponder`).

### 2.7 Settings header palette is off-brand
- **Where:** `app/(tabs)/settings.tsx:246` (`['#667eea', '#764ba2']`) and `:400`
- **Problem:** Settings uses a different purple gradient than the `#6366F1 → #8B5CF6`
  used by every other gradient in the app, and it's the only screen with a full-bleed
  gradient hero header — visually inconsistent.
- **Fix:** Replace both gradients with `['#6366F1', '#8B5CF6']`. Preferably also swap the
  hero header for the standard header pattern used by Calendar/History (left-aligned
  title + subtitle on the light background) so all four tabs match.

### 2.8 Wire the character limit setting into the editors
- **Where:** `app/(tabs)/index.tsx:219-232`, `app/entry/[date].tsx:257-268`,
  `components/organisms/RichTextEditor.tsx:104-107`
- **Problem:** Settings exposes a character limit (100–10,000) but neither editor passes
  `characterLimit` to `RichTextEditor`, so the setting does nothing. Also, when the limit
  is exceeded the editor silently drops `onChange` — typed text still appears in the
  editor but is never saved, which is data-loss-adjacent.
- **Fix:** Load the limit via `SettingsService.loadSettings()` in both screens and pass
  `characterLimit`. In `RichTextEditor.handleChange`, when over the limit still call
  `onChange` (never silently desync) but surface the over-limit state — the count already
  turns red; additionally disable save buttons when `characterCount > characterLimit`
  and show "X characters over limit".

---

## P3 — Consistency, accessibility, and polish

### 3.1 Extract a design-token theme file
- **Where:** new file `lib/theme.ts`; consumers are every screen/component
- **Problem:** Colors, font families, spacing, radii, and shadows are duplicated as magic
  values across ~8 files (e.g. the card shadow block appears 10+ times).
- **Fix:** Create and export `colors`, `fonts`, `spacing`, `radii`, and a `shadows.card`
  preset. Migrate the screens opportunistically (at minimum: any file touched by earlier
  items). Do not introduce a styling library — plain exported constants.

### 3.2 Accessibility pass
- **Where:** all touchables
- **Problem:** No `accessibilityLabel`/`accessibilityRole` anywhere; several targets are
  below the 44×44pt minimum (calendar day cells at small widths, header icon buttons at
  `entry/[date].tsx:221-241`, year-picker close button).
- **Fix:**
  - `accessibilityRole="button"` + descriptive `accessibilityLabel` on all
    `TouchableOpacity`s (e.g. calendar day: `"July 8, has entry"` /
    `accessibilityState={{ selected }}`).
  - `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` on icon-only buttons.
  - Calendar grid: recompute `cellSize` with `useWindowDimensions()` instead of
    `Dimensions.get('window')` (`components/molecules/CalendarGrid.tsx:16`) so rotation
    and split-screen resize correctly.

### 3.3 Unify empty and loading states
- **Where:** `history.tsx:414-417` & `:439-443`, `calendar.tsx:185-189`,
  `index.tsx:148-157`, `settings.tsx:233-239`, `components/atoms/`
- **Problem:** Empty states are bare gray text with no icon or action; loading states mix
  `LoadingSpinner` and raw `ActivityIndicator`; Settings' loader is uncentered (its
  container has no `justifyContent`/`alignItems`).
- **Fix:** Create `components/atoms/EmptyState.tsx` (`icon`, `title`, `subtitle`,
  optional `actionLabel`/`onAction` button). Use it for: History "No journal entries yet"
  (action → switch to Today tab via `router.push('/')`), "No history for this date", and
  the calendar no-entry panel. Standardize all loading indicators on `LoadingSpinner`
  and center the Settings one.

### 3.4 Save button dead zone and layout shift on Today
- **Where:** `app/(tabs)/index.tsx:258-283`
- **Problem:** The Save button is always rendered at 50% opacity when empty (looks
  broken, still occupies space), and the motivational line appears only when empty, so
  the layout jumps as the user starts/stops typing.
- **Fix:** Keep the button mounted but style the disabled state deliberately (solid
  `#CBD5E1` background instead of a transparent gradient). Keep the motivation line
  mounted and fade it with `opacity` (Animated) rather than unmounting, so total height
  never changes.

### 3.5 Entry detail: add delete, and guard data loss on back
- **Where:** `app/entry/[date].tsx`
- **Problems / fixes:**
  1. There is no way to delete an entry anywhere in the app. Add a trash icon in the
     header (view mode), confirm with `Alert.alert` (destructive style), call
     `DatabaseService.deleteEntry` (add it to `services/database.ts` if missing), then
     `router.back()`.
  2. The unsaved-changes prompt (`[date].tsx:170-201`) only fires on the in-app back
     button, not the Android hardware/gesture back. Wire `usePreventRemove` or the
     `beforeRemove` navigation event to the same prompt.
  3. Loading state is bare text (`[date].tsx:203-211`) — use `LoadingSpinner` (3.3).

### 3.6 Relative-date labels: fix pluralization and rounding
- **Where:** `components/molecules/HistoryCard.tsx:23-35`, `index.tsx:132-146`
- **Problem:** `1 weeks ago`, `1 months ago`, `1 years ago` are grammatical bugs;
  "(Today)" next to a full date is noise.
- **Fix:** Add a shared `formatRelativeDate` in `lib/utils/date.ts` with correct
  singular/plural (or use `Intl.RelativeTimeFormat`), use it in both places, and in
  HistoryCard show *only* the relative label when it's Today/Yesterday (skip the
  redundant absolute date when `showDate` is true and diff ≤ 1 day).

### 3.7 Calendar entry-dot visibility
- **Where:** `components/molecules/CalendarGrid.tsx:161-168`
- **Problem:** The 4px amber dot is the only signal a day has an entry — hard to see and
  it disappears against the gradient when selected (white dot helps but is tiny).
- **Fix:** Make days *with entries* visually primary: give them a soft indigo fill
  (`#EEF2FF`) with `#6366F1` text, keep the dot (6px) for reinforcement. Today keeps its
  outline/ring treatment (`borderWidth: 1.5, borderColor: '#6366F1'`) so "today" and
  "has entry" compose cleanly.

### 3.8 Dark mode support (larger effort — do last)
- **Where:** app-wide; depends on 3.1
- **Problem:** All colors are hardcoded light-theme values; `useColorScheme` is unused.
  A journaling app is heavily used at night.
- **Fix:** Extend `lib/theme.ts` with a dark palette and a `useTheme()` hook backed by
  `useColorScheme()`. Convert screens to pull colors from the hook. Include the rich
  editor (`editorStyle` background/color in `RichTextEditor.tsx:192-200`) and the
  HistoryCard preview text. Set `userInterfaceStyle: "automatic"` in `app.json`. This is
  a sweeping change — land it as its own commit after everything above.

---

## Suggested implementation order

1. P1 items 1.1–1.5 (small, independent bug fixes — one commit)
2. 2.1 Toast (unblocks removing alerts elsewhere)
3. 2.3 → 2.4 → 2.5 (History overhaul, in that order)
4. 2.2 Today preview, 2.8 character limit
5. 2.6 Calendar polish, 2.7 Settings header
6. 3.1 theme tokens → 3.2–3.7 polish
7. 3.8 dark mode (final, own commit)

Verify each phase with `npm run lint` and a manual pass in the running app
(`npm run dev`), checking both a fresh install (no entries) and a populated journal.
