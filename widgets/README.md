# One Line Journal Widgets

Home screen widgets for iOS and Android that display today's journal entry and provide quick-add functionality.

## Features

- **1×1 Widget**: Compact widget showing today's entry (truncated to ~80 characters)
- **Quick Add Button**: Tap the "+" button to quickly add a new entry with timestamp
- **Auto-refresh**: Widget updates every 15 minutes
- **Deep linking**: Taps on widget content open the main app

## Setup Instructions

### iOS Widget Setup

1. **Add Widget Extension to Xcode Project**:
   - Open your project in Xcode
   - File → New → Target → Widget Extension
   - Product Name: "OneLineJournalWidget"
   - Include Configuration Intent: No
   - Click Finish

2. **Replace Widget Code**:
   - Copy `widgets/ios/OneLineJournalWidget.swift` to your widget extension folder
   - Replace the auto-generated widget code

3. **Configure App Groups**:
   - Select your main app target
   - Go to Signing & Capabilities
   - Add "App Groups" capability
   - Create/select group: `group.com.scaprisecca.boltexponativewind`
   - Repeat for the widget extension target

4. **Update Info.plist**:
   - Copy `widgets/ios/Info.plist` to your widget extension
   - Or manually add the required keys

5. **Add Native Module**:
   - Copy `modules/widget-manager/ios/` files to your iOS project
   - Run `pod install`

### Android Widget Setup

1. **Add Widget Module**:
   - Copy `widgets/android/` directory to `android/app/src/main/java/com/onelinejournal/widget/`

2. **Update AndroidManifest.xml**:
   Add the widget receiver inside the `<application>` tag in your main AndroidManifest.xml:
   ```xml
   <receiver
       android:name="com.onelinejournal.widget.JournalWidgetProvider"
       android:exported="true">
       <intent-filter>
           <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
           <action android:name="com.onelinejournal.widget.REFRESH" />
       </intent-filter>
       <meta-data
           android:name="android.appwidget.provider"
           android:resource="@xml/journal_widget_info" />
   </receiver>
   ```

3. **Copy Resources**:
   - Copy `widgets/android/src/main/res/` to `android/app/src/main/res/`

4. **Add Native Module**:
   - Copy `modules/widget-manager/android/` files to your Android project
   - Register `WidgetManagerPackage` in MainApplication.java:
   ```java
   import com.onelinejournal.widgetmanager.WidgetManagerPackage;

   @Override
   protected List<ReactPackage> getPackages() {
       return Arrays.asList(
           // ... other packages
           new WidgetManagerPackage()
       );
   }
   ```

5. **Update build.gradle**:
   Ensure Kotlin support is enabled in `android/build.gradle`:
   ```gradle
   dependencies {
       classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0"
   }
   ```

## Usage in React Native

### Update Widget Data

Call `WidgetService.updateWidgetData()` whenever journal entries change:

```typescript
import { WidgetService } from '@/services/widget';

// After creating or updating an entry
await DatabaseService.createEntry(date, content);
await WidgetService.updateWidgetData();
```

### Quick Add from Widget

Handle the quick add deep link in your app:

```typescript
import { Linking } from 'react-native';
import { WidgetService } from '@/services/widget';

Linking.addEventListener('url', ({ url }) => {
  if (url === 'onelinejournal://quickadd') {
    // Show quick add modal or navigate to today screen
  }
});
```

## Technical Details

### Data Sharing

- **iOS**: Uses App Groups via UserDefaults
- **Android**: Uses SharedPreferences
- **Storage Key**: `@widget_today_entry`

### Widget Data Format

```typescript
interface WidgetData {
  date: string;              // YYYY-MM-DD
  htmlContent: string;       // Full HTML content
  plainTextPreview: string;  // Truncated plain text
  lastUpdate: string;        // ISO timestamp
}
```

### Update Frequency

- **iOS**: Updates every 15 minutes (configurable in timeline policy)
- **Android**: Updates every 15 minutes (900000ms)
- **Manual**: Call `WidgetManager.reloadWidgets()` to force update

## Customization

### Change Widget Size

Edit the widget configuration:
- **iOS**: Modify `supportedFamilies` in OneLineJournalWidget.swift
- **Android**: Modify `targetCellWidth` and `targetCellHeight` in journal_widget_info.xml

### Change Colors

- **iOS**: Edit gradient colors in OneLineJournalWidgetEntryView
- **Android**: Edit colors in widget_background.xml

### Change Text Truncation

Modify `truncateText()` in `services/widget.ts`:
```typescript
static truncateText(text: string, maxLength: number = 80): string {
  // Change maxLength default value
}
```

## Troubleshooting

### Widget Not Showing Data

1. Check that App Groups/SharedPreferences are configured correctly
2. Verify `WidgetService.updateWidgetData()` is being called
3. Check console for errors in widget update process

### Widget Not Refreshing

1. Force refresh: `await WidgetManager.reloadWidgets()`
2. Check that native module is linked properly
3. Verify widget is added to home screen

### Build Errors

- **iOS**: Run `pod install` after adding native modules
- **Android**: Clean and rebuild: `cd android && ./gradlew clean && cd ..`

## Testing

### iOS
1. Build and run the app
2. Long press on home screen → Add Widget
3. Search for "One Line Journal"
4. Add widget to home screen

### Android
1. Build and run the app
2. Long press on home screen → Widgets
3. Find "One Line Journal" widget
4. Drag to home screen

## Notes

- Widgets require a development build (not Expo Go)
- iOS widgets require iOS 14+
- Android widgets require API level 23+ (Android 6.0+)
