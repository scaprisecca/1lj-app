# Entry Details Navigation Flow Testing Guide

This guide provides comprehensive end-to-end testing procedures for navigating to entry details from various screens in the One Line Journal app.

## Prerequisites

Before testing navigation flows:

1. ✅ You have a working development build or Expo Go
2. ✅ Database contains multiple journal entries
3. ✅ Test entries exist for various dates
4. ✅ Test on iOS, Android, and Web (if supported)

### Building for Testing

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Expo Go (for quick testing)
npm run dev
```

## Navigation Architecture Overview

The app uses **Expo Router** with file-based routing:

- **Root Layout**: [app/_layout.tsx](app/_layout.tsx)
- **Tab Navigation**: [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)
  - Today: [app/(tabs)/index.tsx](app/(tabs)/index.tsx)
  - Calendar: [app/(tabs)/calendar.tsx](app/(tabs)/calendar.tsx)
  - History: [app/(tabs)/history.tsx](app/(tabs)/history.tsx)
- **Entry Details**: [app/entry/[date].tsx](app/entry/[date].tsx) (dynamic route)

### Key Navigation Patterns

1. **Calendar → Entry Details**: Tap calendar day with entry
2. **History → Entry Details**: Tap history card
3. **Direct URL**: Navigate via `/entry/2025-01-15`
4. **Back Navigation**: Return to previous screen
5. **Edit Mode**: Toggle between view and edit within entry details

## Test Suite 1: Calendar to Entry Details

### Test 1.1: Navigate to Entry from Calendar

**Steps:**
1. Open app
2. Navigate to Calendar tab
3. Observe calendar grid with entries marked
4. Tap on a date that has an entry (blue dot indicator)

**Expected Results:**
- ✅ App navigates to `/entry/[date]` route
- ✅ Entry details screen shows immediately
- ✅ Correct date displayed in header
- ✅ Entry content rendered correctly
- ✅ Edit button visible in header

**Code Reference:**
```typescript
// In calendar.tsx:68-77
const handleDateSelect = (date: string) => {
  setSelectedDate(date);
  const entry = entries.find(e => e.entry_date === date);

  // Navigate to entry details if entry exists
  if (entry) {
    router.push(`/entry/${date}`);
  } else {
    setSelectedEntry(null);
  }
};
```

### Test 1.2: Navigate to Entry with No Data

**Steps:**
1. Navigate to Calendar tab
2. Tap on a date with no entry

**Expected Results:**
- ✅ No navigation occurs
- ✅ Selected date info shows "No entry for this date"
- ✅ "Create Entry" button appears
- ✅ Can tap to create new entry

### Test 1.3: Entry Details Screen Loading

**Steps:**
1. Navigate to Calendar
2. Tap on an entry from several months ago
3. Observe loading state

**Expected Results:**
- ✅ "Loading entry..." message appears briefly
- ✅ Entry loads successfully
- ✅ Historical date formatted correctly (e.g., "Wednesday, January 15, 2025")
- ✅ Content displays in read-only mode initially

### Test 1.4: Back Navigation from Entry Details

**Steps:**
1. Navigate to Calendar
2. Tap an entry
3. On entry details screen, tap back arrow (top-left)

**Expected Results:**
- ✅ Returns to Calendar tab
- ✅ Calendar maintains previous month/year state
- ✅ Previously selected date still highlighted
- ✅ Smooth transition animation

**Code Reference:**
```typescript
// In entry/[date].tsx:162-193
const handleBackPress = () => {
  if (isEditMode) {
    Alert.alert(
      'Unsaved Changes',
      'Do you want to save your changes before going back?',
      // ... options
    );
  } else {
    router.back();
  }
};
```

### Test 1.5: Navigate Between Multiple Entries

**Steps:**
1. Navigate to Calendar
2. Tap entry for January 10
3. View entry
4. Tap back
5. Tap entry for January 15
6. View entry
7. Repeat for 3-4 different dates

**Expected Results:**
- ✅ Each navigation loads correct entry
- ✅ No data bleed between entries
- ✅ Back button always returns to calendar
- ✅ No memory leaks or performance degradation

## Test Suite 2: History to Entry Details

### Test 2.1: Navigate from All Entries Tab

**Steps:**
1. Navigate to History tab
2. Ensure "All Entries" tab is selected
3. Scroll through list of entries
4. Tap on a HistoryCard

**Expected Results:**
- ✅ Navigates to entry details for that date
- ✅ Entry loads with correct content
- ✅ Edit button available

**Note:** Current implementation has `console.log` instead of navigation. Update required:

```typescript
// In history.tsx:420-426
entries.map((entry) => (
  <HistoryCard
    key={entry.id}
    entry={entry}
    onPress={() => console.log('Edit entry:', entry.id)} // TODO: Navigate
  />
))
```

**Fix:**
```typescript
onPress={() => router.push(`/entry/${entry.entry_date}`)}
```

### Test 2.2: Navigate from This Day Tab

**Steps:**
1. Navigate to History tab
2. Tap "This Day" tab
3. View entries from previous years on this date
4. Tap on a historical entry card

**Expected Results:**
- ✅ Navigates to entry details
- ✅ Shows content from that past year
- ✅ Date header shows correct historical date
- ✅ Can edit historical entry

**Note:** Currently also using console.log:

```typescript
// In history.tsx:445-451
historyEntries.map((entry) => (
  <HistoryCard
    key={entry.id}
    entry={entry}
    onPress={() => console.log('View historical entry:', entry.id)} // TODO: Navigate
  />
))
```

**Fix:**
```typescript
onPress={() => router.push(`/entry/${entry.entry_date}`)}
```

### Test 2.3: Back Navigation from History

**Steps:**
1. Navigate to History → All Entries
2. Tap an entry
3. View entry details
4. Tap back arrow

**Expected Results:**
- ✅ Returns to History tab
- ✅ "All Entries" tab still selected
- ✅ Scroll position preserved
- ✅ No reload of entry list

### Test 2.4: Navigation After Refresh

**Steps:**
1. Navigate to History tab
2. Pull down to refresh
3. Wait for refresh to complete
4. Tap an entry

**Expected Results:**
- ✅ Navigation works after refresh
- ✅ Latest data displayed in entry details
- ✅ No stale data shown

## Test Suite 3: Entry Details Screen Functionality

### Test 3.1: View Mode Display

**Steps:**
1. Navigate to any entry via Calendar or History
2. Observe initial view mode

**Expected Results:**
- ✅ Content displayed in white card
- ✅ HTML rendered correctly (bold, italic, lists, etc.)
- ✅ Date formatted in header (e.g., "Wednesday, January 15, 2025")
- ✅ Edit button (pencil icon) visible in top-right
- ✅ Back button visible in top-left
- ✅ No editing toolbar shown
- ✅ Content is scrollable if long

**Code Reference:**
```typescript
// In entry/[date].tsx:252-261
{!isEditMode ? (
  <ScrollView style={styles.contentContainer}>
    <View style={styles.contentCard}>
      <RenderHtml
        contentWidth={width - 96}
        source={{ html: entry.html_body }}
        baseStyle={styles.htmlContent}
      />
    </View>
  </ScrollView>
) : ( /* edit mode */ )}
```

### Test 3.2: Enter Edit Mode

**Steps:**
1. View an entry in read-only mode
2. Tap Edit button (pencil icon) in top-right
3. Observe transition to edit mode

**Expected Results:**
- ✅ Rich text editor appears
- ✅ Current content loaded in editor
- ✅ Formatting toolbar visible
- ✅ Edit button changes to Save button (checkmark icon)
- ✅ Bottom "Save Changes" button appears
- ✅ Character count shown (if enabled)
- ✅ Cursor can be placed in text

**Code Reference:**
```typescript
// In entry/[date].tsx:98-105
const handleEditPress = () => {
  setIsEditMode(true);
  setEnableAutoSave(true);
  // Set initial content in the editor
  setTimeout(() => {
    richTextRef.current?.setContentHTML(editedContent);
  }, 100);
};
```

### Test 3.3: Edit Entry Content

**Steps:**
1. Enter edit mode
2. Modify text content
3. Apply formatting (bold, italic)
4. Add a bulleted list
5. Observe auto-save indicator

**Expected Results:**
- ✅ Text edits reflected immediately
- ✅ Formatting applied correctly
- ✅ Lists render properly
- ✅ Auto-save triggered after 2 seconds of inactivity
- ✅ "Saving..." indicator shows briefly
- ✅ Changes persisted to database

### Test 3.4: Save and Exit Edit Mode

**Steps:**
1. Edit entry content
2. Tap Save button (checkmark) in header
3. Wait for save confirmation

**Expected Results:**
- ✅ Alert shows "Saved!" message
- ✅ Returns to view mode
- ✅ Updated content displayed
- ✅ Edit button reappears
- ✅ Bottom toolbar disappears

**Code Reference:**
```typescript
// In entry/[date].tsx:107-125
const handleSaveAndExit = async () => {
  if (editedContent.trim()) {
    try {
      await saveNow();
      setIsEditMode(false);
      setEnableAutoSave(false);
      Alert.alert('Saved!', 'Your changes have been saved.');
    } catch (error) {
      // Error handling
    }
  }
};
```

### Test 3.5: Back Navigation with Unsaved Changes

**Steps:**
1. Enter edit mode
2. Modify content
3. Tap back arrow before auto-save triggers (< 2 seconds)
4. Observe alert

**Expected Results:**
- ✅ Alert appears: "Unsaved Changes"
- ✅ Three options presented:
  - "Discard" - loses changes, goes back
  - "Save" - saves changes, then goes back
  - "Cancel" - stays on edit screen
- ✅ Selecting "Discard" reverts changes
- ✅ Selecting "Save" persists changes
- ✅ Selecting "Cancel" remains in edit mode

**Code Reference:**
```typescript
// In entry/[date].tsx:162-193
const handleBackPress = () => {
  if (isEditMode) {
    Alert.alert(
      'Unsaved Changes',
      'Do you want to save your changes before going back?',
      [
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setIsEditMode(false);
            setEditedContent(entry?.html_body || '');
            router.back();
          }
        },
        {
          text: 'Save',
          onPress: async () => {
            await saveNow();
            router.back();
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  } else {
    router.back();
  }
};
```

### Test 3.6: Entry Not Found

**Steps:**
1. Manually navigate to `/entry/2099-12-31` (future date with no entry)
2. Observe error state

**Expected Results:**
- ✅ Back button visible
- ✅ "No entry found for this date" message shown
- ✅ No crash or error
- ✅ Can navigate back to previous screen

**Code Reference:**
```typescript
// In entry/[date].tsx:205-218
if (!entry) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
      </View>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No entry found for this date</Text>
      </View>
    </SafeAreaView>
  );
}
```

## Test Suite 4: Cross-Navigation Scenarios

### Test 4.1: Calendar → Entry → Edit → Back → History → Same Entry

**Steps:**
1. Navigate to Calendar
2. Tap entry for January 10
3. Enter edit mode
4. Make changes
5. Save and exit
6. Tap back to Calendar
7. Navigate to History tab
8. Find and tap same entry (January 10)

**Expected Results:**
- ✅ Entry in History shows updated content
- ✅ Both navigation paths load same entry
- ✅ Changes from edit visible everywhere
- ✅ No stale data

### Test 4.2: Deep Link Navigation

**Steps:**
1. From outside app (or terminal), open deep link:
   ```
   onelinejournal://entry/2025-01-15
   ```
2. Observe app behavior

**Expected Results:**
- ✅ App opens (or comes to foreground)
- ✅ Navigates directly to entry details for that date
- ✅ Entry loads correctly
- ✅ Back button returns to last tab (or Today)

**Note:** Requires URL scheme configuration in app.json:
```json
{
  "scheme": "onelinejournal"
}
```

### Test 4.3: Multiple Rapid Navigations

**Steps:**
1. Navigate to Calendar
2. Quickly tap 5 different entries in succession (tap, wait 0.5s, back, repeat)
3. Observe behavior

**Expected Results:**
- ✅ Each entry loads correctly
- ✅ No navigation queue buildup
- ✅ No crashes or freezes
- ✅ Back button always works
- ✅ No memory leaks

### Test 4.4: Navigate After App Backgrounding

**Steps:**
1. Open entry details
2. Put app in background (home button / app switcher)
3. Wait 30 seconds
4. Bring app to foreground
5. Tap back button

**Expected Results:**
- ✅ Entry details still displayed
- ✅ Content not lost
- ✅ Back navigation works
- ✅ Returns to correct tab

## Test Suite 5: Error Scenarios

### Test 5.1: Navigation with Database Error

**Steps:**
1. Simulate database error (disconnect, corrupt, etc.)
2. Navigate to Calendar
3. Tap an entry
4. Observe error handling

**Expected Results:**
- ✅ Error message shown: "Failed to load entry"
- ✅ Retry option available
- ✅ Can navigate back
- ✅ No crash

### Test 5.2: Navigation with Network Interruption

**Steps:**
1. Enable airplane mode
2. Navigate to entry details
3. Edit entry
4. Save

**Expected Results:**
- ✅ Local database save succeeds (offline-first)
- ✅ Backup creation may fail gracefully
- ✅ Entry still viewable
- ✅ No data loss

### Test 5.3: Invalid Date Parameter

**Steps:**
1. Manually navigate to `/entry/invalid-date`
2. Observe behavior

**Expected Results:**
- ✅ Handles gracefully (shows "No entry found" or error)
- ✅ No crash
- ✅ Can navigate back

## Test Suite 6: UI/UX Details

### Test 6.1: Loading States

**Test all loading indicators:**
- Calendar loading: "Loading calendar..."
- Entry details loading: "Loading entry..."
- History loading: "Loading entries..."

**Expected:**
- ✅ Loading spinner visible
- ✅ Loading text displayed
- ✅ Transition smooth when loaded

### Test 6.2: Haptic Feedback (iOS/Android)

**Steps:**
1. Tap calendar entry (navigation)
2. Tap edit button
3. Tap save button
4. Observe haptic feedback

**Expected Results:**
- ✅ Light haptic on edit button tap
- ✅ Success haptic on save
- ✅ No feedback on web

**Code Reference:**
```typescript
// Entry details uses Haptics
if (Platform.OS !== 'web') {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}
```

### Test 6.3: Date Formatting Consistency

**Steps:**
1. View entries from various dates
2. Check date formatting in:
   - Calendar grid
   - Entry details header
   - History cards
   - Selected date display

**Expected Formats:**
- Calendar grid: Day number (e.g., "15")
- Entry details header: "Wednesday, January 15, 2025"
- History cards: "January 15, 2025"
- Relative dates: "2 days ago", "3 weeks ago", etc.

**Expected Results:**
- ✅ Consistent formatting across screens
- ✅ Correct timezone handling
- ✅ Localization support (en-US)

### Test 6.4: Smooth Animations

**Observe animations for:**
- Screen transitions (push/pop)
- Modal appearances
- Button state changes
- Loading states

**Expected Results:**
- ✅ Smooth 60fps animations
- ✅ No jank or stuttering
- ✅ Consistent animation timing
- ✅ Native feel on iOS/Android

## Testing Checklist

### Calendar Navigation
- [ ] Tap entry navigates to details
- [ ] Tap empty date shows "Create Entry"
- [ ] Back button returns to calendar
- [ ] Month/year state preserved
- [ ] Multiple entry navigation works

### History Navigation
- [ ] All Entries tab navigation
- [ ] This Day tab navigation
- [ ] Back button returns to history
- [ ] Tab selection preserved
- [ ] Scroll position preserved

### Entry Details
- [ ] View mode displays correctly
- [ ] Enter edit mode works
- [ ] Save and exit works
- [ ] Auto-save triggers
- [ ] Unsaved changes alert works
- [ ] Entry not found handles gracefully

### Cross-Navigation
- [ ] Calendar → Entry → History flow
- [ ] Deep linking works
- [ ] Rapid navigation stable
- [ ] Background/foreground works

### Error Handling
- [ ] Database error handled
- [ ] Network interruption handled
- [ ] Invalid date handled
- [ ] Loading states shown

### UI/UX
- [ ] Loading states visible
- [ ] Haptics work (mobile)
- [ ] Date formatting consistent
- [ ] Animations smooth

## Known Issues and TODOs

### Issue 1: History Card Navigation Not Implemented

**Location:** [app/(tabs)/history.tsx](app/(tabs)/history.tsx)

**Current Code:**
```typescript
// Line 424 and 449
onPress={() => console.log('Edit entry:', entry.id)}
onPress={() => console.log('View historical entry:', entry.id)}
```

**Fix Required:**
```typescript
onPress={() => router.push(`/entry/${entry.entry_date}`)}
```

**Impact:** Users cannot navigate to entry details from History tab.

### Issue 2: Calendar Selected Entry Navigation

**Location:** [app/(tabs)/calendar.tsx](app/(tabs)/calendar.tsx)

**Current Code:**
```typescript
// Line 196
onPress={() => navigateToEntry(selectedEntry.date)}
```

**Issue:** Uses `entry.date` but schema field is `entry.entry_date`.

**Fix Required:**
```typescript
onPress={() => navigateToEntry(selectedEntry.entry_date)}
```

## Performance Benchmarks

### Navigation Speed
- **Target:** < 300ms from tap to entry details visible
- **Acceptable:** < 500ms
- **Unacceptable:** > 1000ms

### Memory Usage
- **Baseline:** Check memory before navigation
- **After 10 navigations:** Should not increase significantly (< 20MB growth)
- **After 100 navigations:** Watch for memory leaks

### Testing Tools
```bash
# iOS performance monitoring
xcodebuild -workspace YourApp.xcworkspace \
  -scheme YourApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  test

# Android performance monitoring
adb shell am start-activity -W -n com.yourapp/.MainActivity
```

## Automated Testing

Example navigation tests with React Navigation Testing Library:

```typescript
// __tests__/navigation/entry-details.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import CalendarScreen from '@/app/(tabs)/calendar';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('Calendar to Entry Details Navigation', () => {
  it('navigates to entry details when entry is tapped', async () => {
    const { getByText } = render(<CalendarScreen />);

    // Wait for calendar to load
    await waitFor(() => {
      expect(getByText('Calendar')).toBeTruthy();
    });

    // Simulate tapping a date with entry
    const entryDate = '2025-01-15';
    // ... tap simulation

    // Verify navigation
    expect(router.push).toHaveBeenCalledWith(`/entry/${entryDate}`);
  });

  it('does not navigate when empty date is tapped', async () => {
    const { getByText } = render(<CalendarScreen />);

    // Simulate tapping empty date
    // ... tap simulation

    // Verify no navigation
    expect(router.push).not.toHaveBeenCalled();
  });
});
```

## Next Steps

After completing navigation testing:

1. ✅ Fix history card navigation (use router.push)
2. ✅ Fix calendar selected entry date field
3. ✅ Mark task 9.7 as complete in tasks-prd.md
4. Add automated navigation tests
5. Monitor performance metrics
6. Update user documentation

## Additional Resources

- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Navigation Testing](https://reactnavigation.org/docs/testing/)
- [Testing Deep Links](https://docs.expo.dev/guides/linking/)
- [Performance Monitoring](https://reactnative.dev/docs/performance)
