# Widget Testing Guide

This guide provides comprehensive testing procedures for the One Line Journal home widgets on both iOS and Android platforms.

## Prerequisites

Before testing widgets, ensure:

1. ✅ You have built a development build (widgets do NOT work in Expo Go)
2. ✅ Native modules are properly linked
3. ✅ App Groups (iOS) or SharedPreferences (Android) are configured
4. ✅ You have a physical device or simulator/emulator available

### Building for Testing

```bash
# iOS Development Build
npx expo run:ios

# Android Development Build
npx expo run:android
```

## iOS Widget Testing

### Test Environment
- **Minimum iOS Version**: iOS 14.0+
- **Recommended**: iOS 16.0+ for best experience
- **Test Devices**: Physical device or iOS Simulator

### Test 1: Widget Installation

**Steps:**
1. Build and install the app on device
2. Long press on home screen
3. Tap the "+" button in top-left corner
4. Scroll down and search for "One Line Journal"
5. Tap on the widget

**Expected Results:**
- ✅ Widget appears in the widget gallery
- ✅ Widget preview shows placeholder or sample data
- ✅ Widget description is visible

**Troubleshooting:**
- If widget doesn't appear, verify widget extension is included in build
- Check that App Groups capability is enabled for both app and widget extension
- Verify widget target is selected in scheme settings

### Test 2: Widget Display - Empty State

**Steps:**
1. Ensure no journal entry exists for today
2. Add widget to home screen
3. Wait for widget to refresh (or force quit app to trigger refresh)

**Expected Results:**
- ✅ Widget displays "No entry for today" message
- ✅ Widget shows gradient background (purple to blue)
- ✅ Date label shows "Today" or current date
- ✅ "+" button is visible and accessible

**Troubleshooting:**
- If widget shows "Unable to load", check App Groups configuration
- If widget is blank, verify `WidgetService.updateWidgetData()` is called on app launch

### Test 3: Widget Display - With Entry

**Steps:**
1. Open the app
2. Navigate to Today tab
3. Create a journal entry with content (e.g., "This is my first entry for testing widgets!")
4. Save the entry (auto-save or manual save)
5. Return to home screen
6. Observe widget

**Expected Results:**
- ✅ Widget displays entry content (truncated to ~80 characters)
- ✅ Content shows plain text version (HTML stripped)
- ✅ Long entries show "..." truncation indicator
- ✅ Widget updates within 15 minutes

**Manual Refresh:**
```typescript
// Add this to your app code to force immediate refresh
import WidgetManager from '@/modules/widget-manager';
await WidgetManager.reloadWidgets();
```

**Troubleshooting:**
- If widget doesn't update, check AsyncStorage is writing data correctly
- Verify `WIDGET_DATA_KEY` matches between app and widget
- Check Xcode console for widget timeline errors

### Test 4: Widget Quick Add Button

**Steps:**
1. Tap the "+" button on the widget
2. Observe app behavior

**Expected Results:**
- ✅ App opens to Today screen
- ✅ Text editor gains focus
- ✅ Deep link is handled: `onelinejournal://quickadd`

**Note**: The inline text input functionality described in PRD would require a custom widget UI implementation with `AppIntents` (iOS 16+). Current implementation uses deep linking as a simpler, more reliable approach.

**Troubleshooting:**
- If app doesn't open, verify URL scheme in `app.json`:
  ```json
  "scheme": "onelinejournal"
  ```
- Check deep link handler in app code

### Test 5: Widget Data Synchronization

**Steps:**
1. Create an entry in the app
2. Check widget displays the entry
3. Edit the entry (modify content)
4. Force widget refresh or wait for auto-refresh
5. Verify widget shows updated content

**Expected Results:**
- ✅ Widget reflects changes from app
- ✅ Data consistency between app and widget
- ✅ Timestamps update correctly

**Troubleshooting:**
- If widget shows stale data, call `WidgetService.updateWidgetData()` after database operations
- Check `lastUpdate` timestamp in AsyncStorage

### Test 6: Widget Auto-Refresh

**Steps:**
1. Add widget to home screen
2. Create an entry in the app
3. Wait 15 minutes
4. Check if widget updated automatically

**Expected Results:**
- ✅ Widget timeline refreshes every 15 minutes
- ✅ Content updates without manual intervention

**Troubleshooting:**
- Check timeline policy in `OneLineJournalWidget.swift`:
  ```swift
  let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
  ```
- Verify WidgetKit is calling timeline provider

### Test 7: Multiple Widget Instances

**Steps:**
1. Add first widget to home screen
2. Add second widget instance
3. Create/edit entry
4. Verify both widgets update

**Expected Results:**
- ✅ All widget instances show same data
- ✅ All instances update together
- ✅ No performance degradation

## Android Widget Testing

### Test Environment
- **Minimum API Level**: 23 (Android 6.0)
- **Recommended**: API 31+ (Android 12+)
- **Test Devices**: Physical device or Android Emulator

### Test 1: Widget Installation

**Steps:**
1. Build and install the app on device
2. Long press on home screen
3. Tap "Widgets"
4. Scroll and find "One Line Journal"
5. Long press and drag widget to home screen

**Expected Results:**
- ✅ Widget appears in widget picker
- ✅ Widget preview shows placeholder or sample data
- ✅ Widget can be added to home screen

**Troubleshooting:**
- If widget doesn't appear, verify widget receiver is registered in AndroidManifest.xml
- Check widget resources are in correct res/ directories
- Verify Kotlin compilation succeeded

### Test 2: Widget Display - Empty State

**Steps:**
1. Ensure no journal entry exists for today
2. Add widget to home screen
3. Wait for widget to refresh

**Expected Results:**
- ✅ Widget displays "No entry for today" message
- ✅ Widget shows gradient background
- ✅ "+" button is visible

**Troubleshooting:**
- If widget shows error, check SharedPreferences key matches
- Verify RemoteViews layout inflation succeeds
- Check logcat for widget errors: `adb logcat | grep Widget`

### Test 3: Widget Display - With Entry

**Steps:**
1. Open the app
2. Create a journal entry
3. Save the entry
4. Return to home screen
5. Observe widget

**Expected Results:**
- ✅ Widget displays entry content (truncated)
- ✅ Content updates reflect in widget
- ✅ HTML is stripped to plain text

**Troubleshooting:**
- Check `updateWidgetData()` is called after database writes
- Verify SharedPreferences accessibility
- Check widget update intent is sent

### Test 4: Widget Quick Add Button

**Steps:**
1. Tap the "+" button on widget
2. Observe app behavior

**Expected Results:**
- ✅ App opens to Today screen
- ✅ Intent is handled correctly

**Troubleshooting:**
- Verify PendingIntent configuration in `JournalWidgetProvider.kt`
- Check intent flags for Android 12+ compatibility

### Test 5: Widget Update Broadcasting

**Steps:**
1. Add widget to home screen
2. Create entry in app
3. Verify widget updates immediately

**Expected Results:**
- ✅ Widget receives update broadcast
- ✅ `onUpdate()` is called
- ✅ RemoteViews updates successfully

**Code to trigger update:**
```kotlin
val intent = Intent(context, JournalWidgetProvider::class.java).apply {
    action = "com.onelinejournal.widget.REFRESH"
}
context.sendBroadcast(intent)
```

### Test 6: Widget Configuration Persistence

**Steps:**
1. Add widget to home screen
2. Reboot device
3. Check widget still displays correctly

**Expected Results:**
- ✅ Widget survives reboot
- ✅ Data persists in SharedPreferences
- ✅ Widget updates after reboot

### Test 7: Widget Performance

**Steps:**
1. Add multiple widgets to home screen
2. Monitor battery/performance impact
3. Check widget refresh frequency

**Expected Results:**
- ✅ No excessive battery drain
- ✅ Updates occur every 15 minutes as configured
- ✅ No ANR (Application Not Responding) errors

**Monitoring:**
```bash
# Check widget update frequency
adb logcat | grep "JournalWidgetProvider"

# Monitor memory usage
adb shell dumpsys meminfo com.scaprisecca.boltexponativewind
```

## Cross-Platform Tests

### Test 1: Data Format Consistency

**Steps:**
1. Create entry on iOS build
2. Backup and restore on Android build
3. Verify widget displays correctly on both platforms

**Expected Results:**
- ✅ Widget data format is platform-independent
- ✅ HTML content renders correctly as plain text
- ✅ Timestamps are consistent

### Test 2: Character Truncation

**Steps:**
1. Create entry with exactly 80 characters
2. Create entry with 100 characters
3. Create entry with emojis and special characters
4. Verify truncation on both platforms

**Expected Results:**
- ✅ 80 character entries display fully
- ✅ 100 character entries show "..." after 77 characters
- ✅ Emoji and special characters handled correctly
- ✅ Truncation behavior identical on both platforms

**Test Content:**
```
80 chars: "This is a test entry with exactly eighty characters to verify truncation works."
100 chars: "This is a longer test entry with more than eighty characters to verify truncation ellipsis works properly here."
Emojis: "Today was great! 🎉 Had coffee ☕ and went to the park 🌳 with friends 👫"
```

### Test 3: Timestamp Formatting

**Steps:**
1. Create entry at different times (e.g., 09:05, 14:30, 23:45)
2. Use widget quick add to append text
3. Verify timestamp format HH:mm

**Expected Results:**
- ✅ Timestamps show in HH:mm format (e.g., "09:05", "14:30")
- ✅ Leading zeros present (e.g., "09:05" not "9:5")
- ✅ 24-hour format used consistently

## Testing Checklist

Use this checklist to verify widget functionality:

### iOS Widget
- [ ] Widget appears in widget gallery
- [ ] Widget displays empty state correctly
- [ ] Widget shows entry content when available
- [ ] Widget truncates long entries with "..."
- [ ] Widget "+" button opens app
- [ ] Widget updates when entry is created/edited
- [ ] Widget auto-refreshes every 15 minutes
- [ ] Multiple widget instances work correctly
- [ ] Widget survives app termination
- [ ] Widget data persists across app restarts
- [ ] Deep linking works correctly

### Android Widget
- [ ] Widget appears in widget picker
- [ ] Widget displays empty state correctly
- [ ] Widget shows entry content when available
- [ ] Widget truncates long entries with "..."
- [ ] Widget "+" button opens app
- [ ] Widget updates when entry is created/edited
- [ ] Widget auto-refreshes every 15 minutes
- [ ] Widget survives device reboot
- [ ] Widget data persists in SharedPreferences
- [ ] Update broadcasts work correctly

### Cross-Platform
- [ ] Character truncation consistent across platforms
- [ ] HTML stripped correctly on both platforms
- [ ] Timestamp format identical (HH:mm)
- [ ] Data format compatible between platforms
- [ ] Widget data service API works identically

## Common Issues and Solutions

### Issue: Widget Shows "Unable to Load" or Error

**iOS:**
- Verify App Groups: Check both targets have same group ID
- Check UserDefaults suite name matches App Group
- Verify widget extension bundle ID

**Android:**
- Check SharedPreferences permissions
- Verify widget receiver in AndroidManifest.xml
- Check resource files exist in res/ directories

### Issue: Widget Data Not Updating

**Diagnosis:**
```typescript
// Add debug logging to WidgetService
import { WidgetService } from '@/services/widget';

const data = await WidgetService.getWidgetData();
console.log('Widget Data:', data);

const lastUpdate = await WidgetService.getLastUpdate();
console.log('Last Update:', lastUpdate);
```

**Solutions:**
- Call `updateWidgetData()` after every database write
- Force reload: `await WidgetManager.reloadWidgets()`
- Check AsyncStorage is accessible from widget extension

### Issue: Widget Quick Add Not Working

**Check:**
1. URL scheme registered in app.json:
   ```json
   "scheme": "onelinejournal"
   ```

2. Deep link handler exists:
   ```typescript
   import { Linking } from 'react-native';

   Linking.addEventListener('url', ({ url }) => {
     if (url === 'onelinejournal://quickadd') {
       // Handle quick add
     }
   });
   ```

3. PendingIntent configured correctly (Android)

### Issue: Widget Not Appearing in Gallery/Picker

**iOS:**
- Verify widget target included in build scheme
- Check widget extension Info.plist configuration
- Rebuild after adding widget extension

**Android:**
- Verify `@xml/journal_widget_info` exists
- Check widget minimum/maximum size configuration
- Verify widget receiver is exported

### Issue: Widget Performance Problems

**iOS:**
- Reduce timeline entry count
- Optimize widget view complexity
- Check for memory leaks in timeline provider

**Android:**
- Reduce RemoteViews update frequency
- Optimize widget layout complexity
- Check for unnecessary broadcasts

## Testing Tools

### Debug Widget Data (iOS)

```swift
// Add to OneLineJournalWidget.swift for debugging
let userDefaults = UserDefaults(suiteName: "group.com.scaprisecca.boltexponativewind")!
if let data = userDefaults.string(forKey: "@widget_today_entry") {
    print("Widget Data: \(data)")
}
```

### Debug Widget Data (Android)

```bash
# View SharedPreferences
adb shell "run-as com.scaprisecca.boltexponativewind cat /data/data/com.scaprisecca.boltexponativewind/shared_prefs/RCTAsyncLocalStorage_1.xml"
```

### Force Widget Update

```typescript
// Add to app for testing immediate updates
import WidgetManager from '@/modules/widget-manager';
import { WidgetService } from '@/services/widget';

// Update data and force refresh
await WidgetService.updateWidgetData();
await WidgetManager.reloadWidgets();
```

## Automated Testing

While widgets require manual testing on devices, you can test the service layer:

```typescript
// __tests__/services/widget.test.ts
import { WidgetService } from '@/services/widget';

describe('WidgetService', () => {
  it('converts HTML to plain text', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const plain = WidgetService.htmlToPlainText(html);
    expect(plain).toBe('Hello World');
  });

  it('truncates text correctly', () => {
    const text = 'A'.repeat(100);
    const truncated = WidgetService.truncateText(text, 80);
    expect(truncated.length).toBe(80);
    expect(truncated).toMatch(/\.\.\.$/);
  });

  it('escapes HTML correctly', () => {
    const text = '<script>alert("xss")</script>';
    const escaped = WidgetService.escapeHtml(text);
    expect(escaped).not.toContain('<script>');
  });
});
```

## Next Steps

After completing widget testing:

1. ✅ Mark task 9.4 as complete in tasks-prd.md
2. Document any issues found in GitHub issues
3. Update widget documentation with learnings
4. Proceed to task 9.5 (auto-backup testing)

## Additional Resources

- [iOS WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Android App Widgets Documentation](https://developer.android.com/develop/ui/views/appwidgets)
- [Expo Custom Native Code](https://docs.expo.dev/workflow/customizing/)
