# Auto-Backup and Background Tasks Testing Guide

This guide provides comprehensive testing procedures for the automatic backup scheduling and background task functionality in One Line Journal.

## Prerequisites

Before testing auto-backup and background tasks, ensure:

1. ✅ You have built a development build (background tasks do NOT work in Expo Go)
2. ✅ Background fetch permissions are enabled on device
3. ✅ Database is initialized and contains test entries
4. ✅ You have physical device or simulator/emulator available

### Building for Testing

```bash
# iOS Development Build
npx expo run:ios

# Android Development Build
npx expo run:android
```

## Overview of Auto-Backup System

The auto-backup system consists of several interconnected components:

- **TaskManagerService** ([services/task-manager.ts](services/task-manager.ts)) - Handles background task registration and scheduling
- **BackupService** ([services/backup.ts](services/backup.ts)) - Performs backup creation and restoration
- **CompressionService** ([services/compression.ts](services/compression.ts)) - Compresses backups to ZIP format
- **SettingsService** ([services/settings.ts](services/settings.ts)) - Manages backup frequency preferences
- **useBackgroundTaskPermissions** ([hooks/useBackgroundTaskPermissions.ts](hooks/useBackgroundTaskPermissions.ts)) - Hook for permission management

### Key Features

1. **Backup Frequencies**: Daily (every 23+ hours), Weekly (every 168+ hours), or Off
2. **Background Execution**: Tasks run even when app is terminated or device restarts
3. **Retry Logic**: Up to 3 attempts with 5-second delays between retries
4. **Compression**: Optional ZIP compression for backup files
5. **Permission Management**: UI for checking and requesting background task permissions

## iOS Testing

### Test Environment
- **Minimum iOS Version**: iOS 13.0+ (for BackgroundFetch)
- **Recommended**: iOS 14.0+ for best reliability
- **Test Devices**: Physical device or iOS Simulator

### Test 1: Background Fetch Permissions

**Steps:**
1. Open the app
2. Navigate to Settings tab
3. Scroll to "Auto-Backup" section
4. Check "Background Tasks Status"

**Expected Results:**
- ✅ Status shows "Enabled" (green text)
- ✅ If disabled, shows alert with link to settings
- ✅ Permission request flows properly

**Checking Permissions Manually:**
1. Go to iOS Settings app
2. Scroll to "One Line Journal"
3. Verify "Background App Refresh" is ON
4. Go to Settings → General → Background App Refresh
5. Ensure it's enabled system-wide

**Troubleshooting:**
- If status shows "Restricted", check if device has Low Power Mode enabled
- If status shows "Denied", user must manually enable in iOS Settings
- Background App Refresh must be enabled both system-wide AND per-app

### Test 2: Task Registration - Daily Frequency

**Steps:**
1. Open Settings tab
2. Set "Auto-Backup Frequency" to "Daily"
3. Wait for confirmation haptic/visual feedback
4. Check console logs for registration confirmation

**Expected Console Output:**
```
[TaskManager] Background backup task registered with daily frequency
```

**Expected Results:**
- ✅ Task is registered with 12-hour check interval
- ✅ Settings persist across app restarts
- ✅ Task survives app termination

**Verification:**
```typescript
// Add debug code to check registration status
import { TaskManagerService } from '@/services/task-manager';

const isRegistered = await TaskManagerService.isTaskRegistered();
const status = await TaskManagerService.getTaskStatus();
console.log('Task Registered:', isRegistered);
console.log('Task Status:', status);
```

### Test 3: Task Registration - Weekly Frequency

**Steps:**
1. Open Settings tab
2. Set "Auto-Backup Frequency" to "Weekly"
3. Verify task registration

**Expected Results:**
- ✅ Task is registered with 24-hour check interval
- ✅ Settings update correctly
- ✅ Previous daily task is unregistered

**Expected Console Output:**
```
[TaskManager] Background backup task unregistered
[TaskManager] Background backup task registered with weekly frequency
```

### Test 4: Task Unregistration - Off

**Steps:**
1. Open Settings tab
2. Set "Auto-Backup Frequency" to "Off"
3. Verify task unregistration

**Expected Results:**
- ✅ Background task is unregistered
- ✅ No more automatic backups occur
- ✅ Settings show "Off" state

**Expected Console Output:**
```
[TaskManager] Background backup task unregistered
[TaskManager] Auto-backup disabled, task not registered
```

### Test 5: Manual Backup Trigger (Testing)

**Steps:**
1. Add test button to Settings screen (for testing purposes):
```typescript
<Pressable onPress={async () => {
  await TaskManagerService.triggerBackupTaskNow();
  Alert.alert('Success', 'Manual backup completed');
}}>
  <Text>Test Backup Now</Text>
</Pressable>
```
2. Press test button
3. Check backup was created

**Expected Results:**
- ✅ Backup file created in documents directory
- ✅ Backup log entry created in database
- ✅ Last backup time updated

**Troubleshooting:**
- If backup fails, check database is initialized
- Verify file system permissions
- Check console for detailed error messages

### Test 6: Background Task Execution (23-Hour Test)

**Important**: This test requires patience and proper device setup.

**Steps:**
1. Set auto-backup frequency to "Daily"
2. Create or edit a journal entry (to have data to backup)
3. Note the current time
4. Force quit the app (swipe up from app switcher)
5. Wait 12-24 hours
6. Reopen app and check backup history

**Expected Results:**
- ✅ Backup was created automatically within 24 hours
- ✅ Backup appears in history with "auto" type
- ✅ Last backup timestamp is recent

**Accelerated Testing (iOS Simulator):**
```bash
# Trigger background fetch immediately (iOS Simulator only)
xcrun simctl spawn booted log stream --predicate 'process == "OneLineJournal"' --level debug

# In another terminal, trigger background fetch
xcrun simctl spawn booted notify_post "com.apple.BackgroundTaskManagement.launch"
```

**Monitoring:**
Check Console.app (macOS) or Xcode console for background task logs:
```
[BackgroundTask] Starting background backup...
[BackgroundTask] Backup attempt 1/3
[BackgroundTask] Background backup completed successfully
```

### Test 7: Retry Logic on Failure

**Steps:**
1. Simulate backup failure by temporarily breaking file system access
2. Trigger manual backup
3. Observe retry attempts

**Expected Console Output:**
```
[BackgroundTask] Backup attempt 1/3
[BackgroundTask] Backup attempt 1 failed: [error message]
[BackgroundTask] Waiting 5000ms before retry...
[BackgroundTask] Backup attempt 2/3
[BackgroundTask] Backup attempt 2 failed: [error message]
[BackgroundTask] Waiting 5000ms before retry...
[BackgroundTask] Backup attempt 3/3
[BackgroundTask] All 3 backup attempts failed
```

**Expected Results:**
- ✅ Task retries up to 3 times
- ✅ 5-second delay between attempts
- ✅ Task returns Failed status after all attempts
- ✅ Failed backup logged in database

### Test 8: App Termination Survival

**Steps:**
1. Enable daily auto-backup
2. Verify task is registered
3. Force quit app completely
4. Do NOT reopen app for 24+ hours
5. Reopen app and check backup history

**Expected Results:**
- ✅ Backup was created even while app was terminated
- ✅ Task executed in background
- ✅ Backup log shows successful automatic backup

**Note**: iOS may not execute background tasks if device is in Low Power Mode or if app hasn't been used recently.

### Test 9: Backup Frequency Validation

**Test Daily (23 hours):**
1. Set frequency to "Daily"
2. Trigger manual backup
3. Wait 12 hours
4. Observe: No automatic backup (too soon)
5. Wait another 12 hours (24 total)
6. Observe: Automatic backup occurs

**Test Weekly (168 hours):**
1. Set frequency to "Weekly"
2. Trigger manual backup
3. Wait 24-48 hours
4. Observe: No automatic backup (too soon)
5. Wait 7 days total
6. Observe: Automatic backup occurs

**Expected Results:**
- ✅ Daily: Backups occur every ~24 hours
- ✅ Weekly: Backups occur every ~7 days
- ✅ No backups if last backup is recent

## Android Testing

### Test Environment
- **Minimum API Level**: 23 (Android 6.0)
- **Recommended**: API 26+ (Android 8.0+) for best background task support
- **Test Devices**: Physical device or Android Emulator

### Test 1: Background Permissions Check

**Steps:**
1. Open the app
2. Navigate to Settings tab
3. Check "Background Tasks Status"

**Expected Results:**
- ✅ Status shows "Enabled" or "Available"
- ✅ Permission request flows properly

**Android Permissions:**
Unlike iOS, Android doesn't require explicit permission for BackgroundFetch, but:
- Battery optimization should be disabled for the app
- Doze mode may affect background execution

**Checking Permissions Manually:**
1. Go to Android Settings
2. Apps → One Line Journal
3. Battery → Unrestricted (recommended for testing)

### Test 2: Task Registration with Boot Persistence

**Steps:**
1. Set auto-backup frequency to "Daily"
2. Verify task registration
3. Reboot device
4. Reopen app
5. Check task is still registered

**Expected Results:**
- ✅ Task persists across device reboots
- ✅ `startOnBoot: true` configuration works
- ✅ AndroidManifest.xml has RECEIVE_BOOT_COMPLETED permission

**Verification:**
Check [app.json](app.json) includes:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-task-manager",
        {
          "androidPermissions": ["RECEIVE_BOOT_COMPLETED"]
        }
      ]
    ]
  }
}
```

### Test 3: Doze Mode Testing

**Important**: Android Doze mode restricts background tasks to save battery.

**Steps:**
1. Enable daily auto-backup
2. Put device into Doze mode (requires ADB):
```bash
# Force device into Doze mode
adb shell dumpsys deviceidle force-idle

# Check Doze mode status
adb shell dumpsys deviceidle get deep

# Exit Doze mode
adb shell dumpsys deviceidle unforce
```
3. Wait for background task window
4. Check if backup executes

**Expected Results:**
- ✅ Backup may be delayed by Doze mode
- ✅ Backup executes during maintenance window
- ✅ No crashes or errors during Doze

**Workaround for Critical Backups:**
Consider requesting user to disable battery optimization:
```typescript
import { Linking } from 'react-native';

// Request battery optimization exemption
Linking.openSettings();
// User navigates to: Battery → Unrestricted
```

### Test 4: Background Task Logs

**Steps:**
1. Enable daily auto-backup
2. Trigger manual backup
3. Monitor logcat output

**ADB Commands:**
```bash
# Filter for background task logs
adb logcat | grep "BackgroundTask"

# Filter for backup service logs
adb logcat | grep "Backup"

# Filter for task manager logs
adb logcat | grep "TaskManager"
```

**Expected Console Output:**
```
I/BackgroundTask: Starting background backup...
I/BackgroundTask: Backup attempt 1/3
I/Backup: Compressing backup...
I/Backup: Backup compressed successfully: 2.4 KB
I/BackgroundTask: Background backup completed successfully
I/TaskManager: Background backup task registered with daily frequency
```

### Test 5: WorkManager Integration

Android's `expo-task-manager` uses WorkManager under the hood.

**Verification:**
```bash
# Check scheduled work
adb shell dumpsys jobscheduler | grep -A 20 "OneLineJournal"

# Or use WorkManager Inspector in Android Studio
# View → Tool Windows → App Inspection → WorkManager
```

**Expected Results:**
- ✅ WorkManager job is scheduled
- ✅ Job has correct interval (12 or 24 hours)
- ✅ Job persists across reboots

### Test 6: Network Constraints (Optional)

For future: If backups should only occur on WiFi:

**Configuration:**
```typescript
await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
  minimumInterval: interval,
  stopOnTerminate: false,
  startOnBoot: true,
  networkState: BackgroundFetch.NetworkState.UNMETERED, // WiFi only
});
```

**Test with Network Constraint:**
1. Enable WiFi-only setting
2. Disconnect WiFi, use cellular
3. Verify backup doesn't occur
4. Connect to WiFi
5. Verify backup executes

## Cross-Platform Tests

### Test 1: Backup File Format Consistency

**Steps:**
1. Create backup on iOS with compression enabled
2. Transfer file to Android device
3. Restore backup on Android
4. Verify all entries restored correctly

**Expected Results:**
- ✅ ZIP format readable on both platforms
- ✅ JSON data structure compatible
- ✅ No data loss during cross-platform restore

### Test 2: Compression Settings

**Test Without Compression:**
1. Disable compression in settings
2. Create backup
3. Verify `.json` file format
4. Check file size

**Test With Compression:**
1. Enable compression in settings
2. Create backup
3. Verify `.zip` file format
4. Check file size is smaller
5. Restore backup successfully

**Expected Results:**
- ✅ Compressed backups are significantly smaller
- ✅ Both formats restore correctly
- ✅ Settings persist correctly

### Test 3: Last Backup Time Accuracy

**Steps:**
1. Note current time
2. Trigger manual backup
3. Check "Last Backup" time in settings
4. Verify timestamp is accurate
5. Wait 1 hour
6. Check timestamp still shows correct time

**Expected Results:**
- ✅ Last backup time updates immediately after backup
- ✅ Timestamp format is human-readable
- ✅ Timezone handling is correct

### Test 4: Task Status UI

**Steps:**
1. Open Settings tab
2. Check "Background Tasks Status" display
3. Toggle auto-backup between Daily/Weekly/Off
4. Verify status updates in real-time

**Expected Results:**
- ✅ Status shows "Enabled" when background fetch available
- ✅ Status shows "Disabled" when denied
- ✅ Status shows "Restricted" when restricted
- ✅ UI updates immediately after permission changes

## Testing Checklist

Use this checklist to verify auto-backup functionality:

### Background Task Permissions
- [ ] Permission status displays correctly
- [ ] Permission request flow works
- [ ] Settings link opens correctly
- [ ] Permission persists across app restarts

### Task Registration
- [ ] Daily frequency registers task (12h interval)
- [ ] Weekly frequency registers task (24h interval)
- [ ] Off setting unregisters task
- [ ] Task registration survives app termination
- [ ] Task registration survives device reboot (Android)

### Backup Execution
- [ ] Manual backup creates file successfully
- [ ] Manual backup logs entry in database
- [ ] Manual backup updates last backup time
- [ ] Auto backup triggers at correct intervals
- [ ] Auto backup works with app terminated
- [ ] Auto backup works with app in background

### Retry Logic
- [ ] Backup retries on failure (max 3 attempts)
- [ ] 5-second delay between retries
- [ ] Failed backups logged correctly
- [ ] Success after retry updates correctly

### Compression
- [ ] Backups compress to ZIP format when enabled
- [ ] Compressed backups restore correctly
- [ ] Uncompressed JSON backups work correctly
- [ ] File sizes are significantly smaller with compression

### Frequency Validation
- [ ] Daily backups don't occur within 23 hours
- [ ] Daily backups do occur after 23+ hours
- [ ] Weekly backups don't occur within 168 hours
- [ ] Weekly backups do occur after 168+ hours

### Platform-Specific
- [ ] iOS: Background App Refresh permission handled
- [ ] iOS: Low Power Mode detection works
- [ ] Android: Boot persistence works (RECEIVE_BOOT_COMPLETED)
- [ ] Android: Doze mode doesn't crash app
- [ ] Android: WorkManager jobs scheduled correctly

## Common Issues and Solutions

### Issue: Background Tasks Not Executing

**iOS:**
1. Check Background App Refresh is ON (system-wide and per-app)
2. Verify Low Power Mode is OFF
3. Ensure app has been used recently (iOS deprioritizes unused apps)
4. Check Console.app for background task logs

**Android:**
1. Check battery optimization is not aggressive
2. Verify Doze mode isn't preventing execution
3. Check WorkManager jobs are scheduled
4. Use `adb shell dumpsys jobscheduler` to inspect

### Issue: "Background Tasks Denied" Status

**Solution:**
1. Guide user to device settings
2. iOS: Settings → [App Name] → Background App Refresh → ON
3. Android: Settings → Apps → [App Name] → Battery → Unrestricted
4. Provide clear in-app instructions

### Issue: Backups Not Occurring at Expected Time

**Diagnosis:**
```typescript
// Add debug logging
const status = await TaskManagerService.getTaskStatus();
console.log('Task Status:', JSON.stringify(status, null, 2));

const shouldBackup = await TaskManagerService.shouldPerformBackup(status.frequency);
console.log('Should Backup:', shouldBackup);
```

**Common Causes:**
1. Last backup time is too recent (< 23 hours for daily)
2. Background fetch status is not "Available"
3. Task not registered correctly
4. Operating system hasn't scheduled task yet

### Issue: Compression Failures

**Symptoms:**
- Backup creates JSON but not ZIP
- Console shows compression error

**Solutions:**
1. Check `react-native-zip-archive` is linked
2. Verify file system permissions
3. Check available storage space
4. Fall back to uncompressed backup on error

**Code:**
```typescript
// The BackupService already handles this
catch (compressionError) {
  console.error('[Backup] Compression failed, using uncompressed backup:', compressionError);
  // Continue with uncompressed backup
}
```

### Issue: Task Registration Fails

**Error Messages:**
```
Error: Background tasks are disabled. Please enable them in system settings.
Error: Background tasks are restricted on this device.
```

**Solutions:**
1. Check `expo-task-manager` is installed: `npm install expo-task-manager`
2. Verify app.json includes task-manager plugin
3. Rebuild app after configuration changes
4. Check native module linking

## Testing Tools and Utilities

### Debug Task Status Component

Add to Settings screen for comprehensive status info:

```typescript
import { TaskManagerService } from '@/services/task-manager';
import { useEffect, useState } from 'react';

function DebugTaskStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      const taskStatus = await TaskManagerService.getTaskStatus();
      setStatus(taskStatus);
    };
    load();
  }, []);

  if (!status) return null;

  return (
    <View style={{ padding: 16, backgroundColor: '#f0f0f0' }}>
      <Text style={{ fontFamily: 'Inter-Bold' }}>Debug Task Status</Text>
      <Text>Registered: {status.isRegistered ? 'Yes' : 'No'}</Text>
      <Text>Status: {status.backgroundFetchStatus}</Text>
      <Text>Frequency: {status.frequency}</Text>
      <Text>Last Backup: {status.lastBackupTime || 'Never'}</Text>
    </View>
  );
}
```

### Force Background Task Execution

For testing immediate execution:

```typescript
// Add test button
<Pressable
  onPress={async () => {
    try {
      await TaskManagerService.triggerBackupTaskNow();
      Alert.alert('Success', 'Manual backup completed');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  }}
  style={{ padding: 12, backgroundColor: '#007AFF', borderRadius: 8 }}
>
  <Text style={{ color: 'white' }}>Test Backup Now</Text>
</Pressable>
```

### Monitor Background Task Logs (iOS)

```bash
# Using Console.app (macOS)
# 1. Open Console.app
# 2. Select your device
# 3. Filter: process:OneLineJournal
# 4. Look for [BackgroundTask] logs

# Using Xcode
# 1. Window → Devices and Simulators
# 2. Select device → Open Console
# 3. Filter for BackgroundTask
```

### Monitor Background Task Logs (Android)

```bash
# Real-time monitoring
adb logcat | grep -E "(BackgroundTask|Backup|TaskManager)"

# Save to file for analysis
adb logcat -d > logcat.txt

# Filter specific priority (Error, Warning, Info)
adb logcat "*:E" | grep BackgroundTask
```

### Simulate Time Passing (for Testing)

**Note**: There's no reliable way to simulate time for background tasks. Best approaches:

1. **Reduce interval for testing**:
```typescript
// Temporarily in task-manager.ts
const interval = 60 * 15; // 15 minutes instead of 12 hours
```

2. **Manual trigger** (shown above)

3. **Actual waiting** (most reliable, but time-consuming)

## Automated Testing

While background tasks require manual testing on devices, you can test the service layer:

```typescript
// __tests__/services/task-manager.test.ts
import { TaskManagerService } from '@/services/task-manager';

describe('TaskManagerService', () => {
  it('calculates correct interval for daily frequency', () => {
    const interval = TaskManagerService['getIntervalForFrequency']('daily');
    expect(interval).toBe(60 * 60 * 12); // 12 hours
  });

  it('calculates correct interval for weekly frequency', () => {
    const interval = TaskManagerService['getIntervalForFrequency']('weekly');
    expect(interval).toBe(60 * 60 * 24); // 24 hours
  });

  it('determines backup should occur with no previous backup', async () => {
    // Mock SettingsService to return null
    const shouldBackup = await TaskManagerService['shouldPerformBackup']('daily');
    expect(shouldBackup).toBe(true);
  });

  it('determines backup should not occur within 23 hours', async () => {
    // Mock SettingsService to return recent timestamp
    const recentTime = new Date(Date.now() - 60 * 60 * 1000 * 10); // 10 hours ago
    // Mock getSetting to return recentTime
    const shouldBackup = await TaskManagerService['shouldPerformBackup']('daily');
    expect(shouldBackup).toBe(false);
  });
});
```

## Next Steps

After completing auto-backup testing:

1. ✅ Mark task 9.5 as complete in tasks-prd.md
2. Document any platform-specific quirks discovered
3. Update user-facing documentation with battery optimization tips
4. Proceed to task 9.6 (rich text editor testing)

## Additional Resources

- [Expo Background Fetch Documentation](https://docs.expo.dev/versions/latest/sdk/background-fetch/)
- [Expo Task Manager Documentation](https://docs.expo.dev/versions/latest/sdk/task-manager/)
- [iOS Background Execution](https://developer.apple.com/documentation/uikit/app_and_environment/scenes/preparing_your_ui_to_run_in_the_background)
- [Android Background Tasks](https://developer.android.com/guide/background)
- [Android Doze Mode](https://developer.android.com/training/monitoring-device-state/doze-standby)
- [Android WorkManager](https://developer.android.com/topic/libraries/architecture/workmanager)
