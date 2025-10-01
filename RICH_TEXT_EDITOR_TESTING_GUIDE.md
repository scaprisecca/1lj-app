# Rich Text Editor Testing Guide

This guide provides comprehensive testing procedures for the rich text editor functionality in One Line Journal, including cross-platform compatibility testing.

## Prerequisites

Before testing the rich text editor:

1. ✅ You have a working development build or Expo Go
2. ✅ Database is initialized
3. ✅ Settings are configured with character limit
4. ✅ Test devices available: iOS, Android, and Web (if supported)

### Building for Testing

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npm run build:web

# Development mode
npm run dev
```

## Overview of Rich Text Editor

The rich text editor is built with `react-native-pell-rich-editor` and includes:

- **Component**: [components/organisms/RichTextEditor.tsx](components/organisms/RichTextEditor.tsx)
- **HTML Utilities**: [utils/html.ts](utils/html.ts)
- **Auto-save Hook**: [hooks/useAutoSave.ts](hooks/useAutoSave.ts)
- **Integration**: Used in [app/(tabs)/index.tsx](app/(tabs)/index.tsx) (Today screen)

### Key Features

1. **Rich Text Formatting**: Bold, Italic, Underline, Headings, Lists
2. **Character Counting**: Counts plain text characters (excludes HTML tags)
3. **Character Limit**: Enforces limit with visual warnings
4. **Auto-save**: Saves content automatically with 2-second delay
5. **HTML Storage**: Stores content as HTML in database
6. **Cross-platform**: Works on iOS, Android, and Web

## Core Editor Functionality Tests

### Test 1: Basic Text Input

**Steps:**
1. Open the app
2. Navigate to Today tab
3. Tap on the editor area
4. Type "Hello World"

**Expected Results:**
- ✅ Editor gains focus (keyboard appears)
- ✅ Text appears in real-time
- ✅ Character count updates: "11 characters" (if enabled)
- ✅ Auto-save indicator appears after 2 seconds
- ✅ Content persists after app restart

**Platform-Specific:**
- **iOS**: Keyboard should have proper toolbar
- **Android**: Keyboard should not cover editor
- **Web**: Desktop typing should work smoothly

### Test 2: Bold Formatting

**Steps:**
1. Type "This is bold text"
2. Select the word "bold"
3. Tap the Bold (B) button in toolbar
4. Verify formatting applied

**Expected Results:**
- ✅ Selected text becomes bold
- ✅ HTML stored as: `<strong>bold</strong>` or `<b>bold</b>`
- ✅ Character count remains 18 (HTML tags not counted)
- ✅ Bold formatting persists after save/reload

**HTML Verification:**
```typescript
// Check stored HTML in database
const entry = await DatabaseService.getEntryByDate(today);
console.log(entry.html_body);
// Should contain: "This is <strong>bold</strong> text" or "<b>bold</b>"
```

### Test 3: Italic Formatting

**Steps:**
1. Type "This is italic text"
2. Select the word "italic"
3. Tap the Italic (I) button
4. Verify formatting

**Expected Results:**
- ✅ Selected text becomes italicized
- ✅ HTML stored as: `<em>italic</em>` or `<i>italic</i>`
- ✅ Character count correct
- ✅ Italic persists after reload

### Test 4: Underline Formatting

**Steps:**
1. Type "This is underlined text"
2. Select the word "underlined"
3. Tap the Underline (U) button
4. Verify formatting

**Expected Results:**
- ✅ Selected text becomes underlined
- ✅ HTML stored as: `<u>underlined</u>`
- ✅ Formatting persists

### Test 5: Combined Formatting

**Steps:**
1. Type "Bold Italic Underline All"
2. Select "Bold" → Apply Bold
3. Select "Italic" → Apply Italic
4. Select "Underline" → Apply Underline
5. Select "All" → Apply Bold, Italic, Underline
6. Save and reload

**Expected Results:**
- ✅ All formatting renders correctly
- ✅ Nested HTML tags are valid
- ✅ Character count: 24 characters (ignoring tags)
- ✅ All formatting persists after reload

**HTML Example:**
```html
<strong>Bold</strong> <em>Italic</em> <u>Underline</u> <strong><em><u>All</u></em></strong>
```

### Test 6: Heading 1

**Steps:**
1. Type "This is a heading"
2. Place cursor in the line
3. Tap H1 button in toolbar
4. Verify heading applied

**Expected Results:**
- ✅ Text becomes larger (h1 style)
- ✅ HTML stored as: `<h1>This is a heading</h1>`
- ✅ Character count: 17
- ✅ Heading persists

### Test 7: Heading 2

**Steps:**
1. Type "This is a subheading"
2. Place cursor in line
3. Tap H2 button
4. Verify heading applied

**Expected Results:**
- ✅ Text becomes medium-large (h2 style)
- ✅ HTML stored as: `<h2>This is a subheading</h2>`
- ✅ Character count: 20

### Test 8: Paragraph

**Steps:**
1. Type "First paragraph"
2. Press Enter
3. Type "Second paragraph"
4. Select both lines
5. Tap Paragraph button

**Expected Results:**
- ✅ Content wrapped in `<p>` tags
- ✅ Line breaks preserved
- ✅ HTML structure valid

**HTML Example:**
```html
<p>First paragraph</p>
<p>Second paragraph</p>
```

### Test 9: Bulleted List

**Steps:**
1. Tap Bullet List button
2. Type "Item 1" and press Enter
3. Type "Item 2" and press Enter
4. Type "Item 3"
5. Save and reload

**Expected Results:**
- ✅ Bullets render correctly
- ✅ HTML stored as `<ul><li>` structure
- ✅ Character count: 18 (ignoring list markup)
- ✅ List persists after reload

**HTML Example:**
```html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>
```

### Test 10: Numbered List

**Steps:**
1. Tap Numbered List button
2. Type "First" and press Enter
3. Type "Second" and press Enter
4. Type "Third"
5. Verify numbering

**Expected Results:**
- ✅ Numbers appear automatically (1, 2, 3)
- ✅ HTML stored as `<ol><li>` structure
- ✅ Character count correct
- ✅ Numbering persists

**HTML Example:**
```html
<ol>
  <li>First</li>
  <li>Second</li>
  <li>Third</li>
</ol>
```

### Test 11: Undo/Redo

**Steps:**
1. Type "Test text"
2. Format as bold
3. Tap Undo button
4. Verify formatting removed
5. Tap Redo button
6. Verify formatting reapplied

**Expected Results:**
- ✅ Undo removes last action
- ✅ Redo reapplies action
- ✅ Multiple undo/redo works correctly
- ✅ Undo history maintained during session

## Character Limit Tests

### Test 12: Character Count Display

**Steps:**
1. Ensure character count is enabled in settings
2. Type "Hello World"
3. Check character count display

**Expected Results:**
- ✅ Character count shows "11 / 280 characters" (or configured limit)
- ✅ Count updates in real-time
- ✅ HTML tags not included in count
- ✅ Display at bottom of editor

### Test 13: Character Limit Warning (90%)

**Steps:**
1. Set character limit to 100 in settings
2. Type 90 characters
3. Observe visual warning

**Expected Results:**
- ✅ Character count turns orange/amber (#F59E0B)
- ✅ Count shows "90 / 100 characters"
- ✅ Editor still allows typing
- ✅ Visual warning helps user

### Test 14: Character Limit Enforcement (100%)

**Steps:**
1. Set character limit to 100
2. Type 100 characters
3. Attempt to type more

**Expected Results:**
- ✅ Character count turns red (#EF4444)
- ✅ Count shows "100 / 100 characters"
- ✅ Editor prevents additional typing
- ✅ `onChange` not called when limit exceeded

**Code Verification:**
```typescript
// In RichTextEditor.tsx
if (characterLimit && newCharCount > characterLimit) {
  // Don't call onChange if limit exceeded
  return;
}
```

### Test 15: Character Count with Formatting

**Steps:**
1. Type "Bold Text" (9 chars)
2. Select all and apply Bold
3. Check character count

**Expected Results:**
- ✅ Count remains 9 (ignoring `<strong>` tags)
- ✅ HTML utilities correctly strip tags
- ✅ Count accurate for all formatting combinations

**Verification:**
```typescript
import { countHtmlCharacters } from '@/utils/html';

const html = '<strong>Bold Text</strong>';
const count = countHtmlCharacters(html);
console.log(count); // Should output: 9
```

### Test 16: Character Count with Lists

**Steps:**
1. Create bulleted list:
   - Item 1 (6 chars)
   - Item 2 (6 chars)
   - Item 3 (6 chars)
2. Check character count

**Expected Results:**
- ✅ Count is 18 (ignoring `<ul>` and `<li>` tags)
- ✅ Spaces between items counted correctly
- ✅ List markup not included

### Test 17: Character Count with Entities

**Steps:**
1. Type "AT&T's product"
2. Check character count
3. Verify HTML entities handled

**Expected Results:**
- ✅ Count is 14 characters
- ✅ `&amp;` entity decoded to `&` for counting
- ✅ Apostrophe handled correctly
- ✅ Special characters counted as single characters

**HTML Example:**
```html
AT&amp;T&#39;s product
```

**Plain Text:**
```
AT&T's product
```

## Auto-Save Tests

### Test 18: Auto-Save Trigger

**Steps:**
1. Type "Test content"
2. Stop typing
3. Wait 2 seconds
4. Observe auto-save indicator

**Expected Results:**
- ✅ Saving indicator appears after 2 seconds
- ✅ "Saving..." text shows briefly
- ✅ Entry saved to database
- ✅ Last saved timestamp updates

**Code Configuration:**
```typescript
// In index.tsx
const { saveNow, isSaving, lastSaved } = useAutoSave(entry, {
  onSave: saveEntry,
  delay: 2000, // 2 second delay
  enabled: enableAutoSave && !!entry.trim(),
});
```

### Test 19: Auto-Save Debouncing

**Steps:**
1. Type "T"
2. Wait 1 second
3. Type "e"
4. Wait 1 second
5. Type "st"
6. Stop typing for 2 seconds

**Expected Results:**
- ✅ Auto-save only triggers once after final edit
- ✅ Previous debounce timers cancelled
- ✅ No multiple simultaneous saves
- ✅ Database written once with final content

### Test 20: Manual Save

**Steps:**
1. Type "Manual save test"
2. Tap Save button (if shown)
3. Verify immediate save

**Expected Results:**
- ✅ Save occurs immediately
- ✅ No wait for auto-save delay
- ✅ Success alert or confirmation
- ✅ Entry in database

### Test 21: Save on Blur

**Steps:**
1. Type "Blur test"
2. Tap outside editor (lose focus)
3. Verify save triggered

**Expected Results:**
- ✅ Save triggered on blur event
- ✅ Content persists
- ✅ No content loss

**Code:**
```typescript
const handleRichTextBlur = async () => {
  // Save on blur if there's content
  if (entry.trim()) {
    await saveNow();
  }
};
```

### Test 22: Auto-Save Error Handling

**Steps:**
1. Simulate database error (disconnect, full disk, etc.)
2. Type content
3. Wait for auto-save
4. Observe error handling

**Expected Results:**
- ✅ Error alert shown to user
- ✅ "Failed to auto-save your entry" message
- ✅ Content retained in editor (not lost)
- ✅ User can retry manually

## HTML Utilities Tests

### Test 23: HTML to Plain Text Conversion

**Test Cases:**
```typescript
import { htmlToPlainText } from '@/utils/html';

// Test 1: Simple HTML
htmlToPlainText('<p>Hello World</p>');
// Expected: "Hello World"

// Test 2: Nested tags
htmlToPlainText('<p><strong>Bold</strong> text</p>');
// Expected: "Bold text"

// Test 3: Entities
htmlToPlainText('AT&amp;T&nbsp;mobile');
// Expected: "AT&T mobile"

// Test 4: Multiple spaces
htmlToPlainText('<p>Too    many   spaces</p>');
// Expected: "Too many spaces"

// Test 5: Empty tags
htmlToPlainText('<p></p><div></div>');
// Expected: ""
```

**Expected Results:**
- ✅ All HTML tags removed
- ✅ HTML entities decoded
- ✅ Whitespace normalized
- ✅ Empty strings handled

### Test 24: Character Counting

**Test Cases:**
```typescript
import { countHtmlCharacters } from '@/utils/html';

// Test 1: Plain text
countHtmlCharacters('Hello World');
// Expected: 11

// Test 2: With HTML
countHtmlCharacters('<strong>Hello World</strong>');
// Expected: 11

// Test 3: Complex HTML
countHtmlCharacters('<h1>Title</h1><p>Paragraph with <em>emphasis</em></p>');
// Expected: 24 ("Title" + "Paragraph with emphasis")

// Test 4: Empty
countHtmlCharacters('');
// Expected: 0

// Test 5: Only tags
countHtmlCharacters('<p></p><div></div>');
// Expected: 0
```

**Expected Results:**
- ✅ Accurate character counts
- ✅ Tags excluded from count
- ✅ Edge cases handled

### Test 25: HTML Empty Check

**Test Cases:**
```typescript
import { isHtmlEmpty } from '@/utils/html';

// Test 1: Empty string
isHtmlEmpty('');
// Expected: true

// Test 2: Only whitespace
isHtmlEmpty('   ');
// Expected: true

// Test 3: Only empty tags
isHtmlEmpty('<p></p><div></div>');
// Expected: true

// Test 4: With content
isHtmlEmpty('<p>Content</p>');
// Expected: false

// Test 5: Only whitespace in tags
isHtmlEmpty('<p>   </p>');
// Expected: true
```

**Expected Results:**
- ✅ Correctly identifies empty content
- ✅ Whitespace-only treated as empty
- ✅ Empty tags treated as empty

### Test 26: Text Preview Creation

**Test Cases:**
```typescript
import { createTextPreview } from '@/utils/html';

// Test 1: Short text
createTextPreview('<p>Short</p>', 150);
// Expected: "Short"

// Test 2: Long text
const longHtml = '<p>' + 'A'.repeat(200) + '</p>';
createTextPreview(longHtml, 150);
// Expected: "AAA..." (150 chars + "...")

// Test 3: With formatting
createTextPreview('<h1>Title</h1><p>Body text here</p>', 20);
// Expected: "Title Body text h..." (truncated)
```

**Expected Results:**
- ✅ Respects max length
- ✅ Adds ellipsis when truncated
- ✅ Strips all HTML
- ✅ Useful for previews

## Cross-Platform Tests

### Test 27: iOS Editor

**Platform-Specific Features:**
1. Font rendering: Inter font family
2. Keyboard toolbar: Should show above keyboard
3. Haptic feedback: On save and interactions
4. Scroll behavior: Editor scrolls with keyboard

**Steps:**
1. Open app on iOS device/simulator
2. Test all formatting options
3. Test character counting
4. Test auto-save
5. Test app backgrounding/foregrounding

**Expected Results:**
- ✅ Editor renders correctly
- ✅ Keyboard doesn't cover content
- ✅ Toolbar buttons accessible
- ✅ Haptics work on physical device
- ✅ Content persists during lifecycle events

**iOS-Specific CSS:**
```typescript
fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter-Regular'
```

### Test 28: Android Editor

**Platform-Specific Features:**
1. Font rendering: Inter-Regular font family
2. Keyboard behavior: May vary by manufacturer
3. Back button: Should not lose content
4. Hardware keyboard: If available

**Steps:**
1. Open app on Android device/emulator
2. Test all formatting options
3. Test character counting
4. Test auto-save
5. Test back button behavior

**Expected Results:**
- ✅ Editor renders correctly
- ✅ Keyboard handling proper
- ✅ Toolbar visible and accessible
- ✅ Back button saves before exit
- ✅ Content persists

**Android-Specific Considerations:**
- Different keyboard apps may behave differently
- Samsung, Google Keyboard, etc.
- Test on multiple devices if possible

### Test 29: Web Editor

**Platform-Specific Features:**
1. Desktop keyboard shortcuts (Ctrl+B, Ctrl+I, etc.)
2. Mouse selection
3. Copy/paste from browser
4. Browser compatibility (Chrome, Firefox, Safari)

**Steps:**
1. Build for web: `npm run build:web`
2. Open in browser
3. Test all formatting options
4. Test keyboard shortcuts
5. Test copy/paste

**Expected Results:**
- ✅ Editor renders in browser
- ✅ Keyboard shortcuts work
- ✅ Mouse selection works
- ✅ Copy/paste functional
- ✅ Responsive design

**Note**: Web support may be limited depending on `react-native-pell-rich-editor` compatibility.

### Test 30: Font Consistency

**Steps:**
1. Create entry on iOS with formatted text
2. View same entry on Android
3. View on Web
4. Compare rendering

**Expected Results:**
- ✅ Bold text looks bold on all platforms
- ✅ Italic text looks italic on all platforms
- ✅ Headings sized consistently
- ✅ Lists render correctly
- ✅ Character spacing consistent

### Test 31: Data Portability

**Steps:**
1. Create rich entry on iOS:
   - Heading
   - Bold text
   - List
   - Total 150 characters
2. Create backup
3. Restore on Android device
4. View entry

**Expected Results:**
- ✅ All formatting preserved
- ✅ Character count matches
- ✅ HTML structure intact
- ✅ No data loss

## Edge Cases and Error Handling

### Test 32: Empty Editor

**Steps:**
1. Open editor
2. Don't type anything
3. Tap Save

**Expected Results:**
- ✅ No database entry created
- ✅ No error thrown
- ✅ Character count shows "0 characters"
- ✅ Auto-save doesn't trigger

### Test 33: Very Long Entry

**Steps:**
1. Set character limit to max (10,000)
2. Type 10,000 characters
3. Apply various formatting
4. Save entry
5. Reload and verify

**Expected Results:**
- ✅ Editor handles large content
- ✅ Performance acceptable
- ✅ All content saved
- ✅ Reload successful
- ✅ No truncation

### Test 34: Special Characters

**Test Characters:**
- Emojis: 😀 🎉 ❤️ 🌟
- Accents: café, naïve, résumé
- Symbols: © ® ™ € £ ¥
- Math: ∞ ≈ ≠ ≤ ≥
- Arrows: → ← ↑ ↓

**Steps:**
1. Type each category of special characters
2. Apply formatting
3. Save and reload
4. Verify character count

**Expected Results:**
- ✅ All special characters render
- ✅ Character count accurate
- ✅ No encoding issues
- ✅ Content persists correctly

### Test 35: Copy/Paste Rich Text

**Steps:**
1. Copy formatted text from external source (Word, Google Docs, etc.)
2. Paste into editor
3. Observe result

**Expected Results:**
- ✅ Text pastes successfully
- ✅ Some formatting may be preserved
- ✅ No crash or error
- ✅ Content editable after paste

**Note**: Formatting preservation depends on `react-native-pell-rich-editor` capabilities.

### Test 36: Rapid Typing

**Steps:**
1. Type very quickly without stopping
2. Observe editor responsiveness
3. Check character count updates
4. Verify auto-save triggers

**Expected Results:**
- ✅ No lag or stuttering
- ✅ All characters captured
- ✅ Character count updates smoothly
- ✅ Auto-save waits for pause

### Test 37: Network Interruption During Save

**Steps:**
1. Enable airplane mode
2. Type content
3. Trigger save
4. Observe error handling
5. Re-enable network
6. Retry save

**Expected Results:**
- ✅ Error alert shown
- ✅ Content not lost
- ✅ User can retry
- ✅ Successful save after network restored

**Note**: This assumes backup or sync features; local database saves should work offline.

### Test 38: App Crash Recovery

**Steps:**
1. Type content (don't save manually)
2. Force kill app (don't wait for auto-save)
3. Reopen app
4. Check if content recovered

**Expected Results:**
- ✅ Auto-save occurred before crash (if 2s passed)
- ✅ Content present after reopen
- ✅ If not auto-saved, content lost (expected behavior)

**Improvement Idea**: Consider draft persistence to localStorage/AsyncStorage for crash recovery.

## Testing Checklist

Use this checklist to verify rich text editor functionality:

### Basic Functionality
- [ ] Text input works
- [ ] Focus/blur works
- [ ] Keyboard appears/dismisses correctly

### Formatting Options
- [ ] Bold formatting
- [ ] Italic formatting
- [ ] Underline formatting
- [ ] Heading 1
- [ ] Heading 2
- [ ] Paragraph
- [ ] Bulleted list
- [ ] Numbered list
- [ ] Undo
- [ ] Redo
- [ ] Combined formatting

### Character Counting
- [ ] Count displays correctly
- [ ] Count excludes HTML tags
- [ ] Count includes entities correctly
- [ ] 90% warning (orange)
- [ ] 100% limit (red)
- [ ] Typing prevented at limit

### Auto-Save
- [ ] Auto-save after 2 seconds
- [ ] Debouncing works
- [ ] Save on blur
- [ ] Manual save
- [ ] Error handling
- [ ] Last saved indicator

### HTML Utilities
- [ ] HTML to plain text conversion
- [ ] Character counting utility
- [ ] Empty check utility
- [ ] Text preview creation

### Cross-Platform
- [ ] iOS rendering
- [ ] Android rendering
- [ ] Web rendering (if supported)
- [ ] Font consistency
- [ ] Data portability

### Edge Cases
- [ ] Empty editor
- [ ] Very long entry (10k chars)
- [ ] Special characters
- [ ] Emojis
- [ ] Copy/paste
- [ ] Rapid typing
- [ ] Network interruption
- [ ] App crash recovery

## Common Issues and Solutions

### Issue: Character Count Incorrect

**Symptoms:**
- Count doesn't match visible text
- HTML tags being counted

**Solution:**
```typescript
// Verify html.ts utilities are used
import { countHtmlCharacters } from '@/utils/html';
const count = countHtmlCharacters(htmlContent);
```

### Issue: Formatting Not Persisting

**Symptoms:**
- Bold/italic lost after reload
- HTML tags not in database

**Diagnosis:**
```typescript
// Check database entry
const entry = await DatabaseService.getEntryByDate(today);
console.log('Stored HTML:', entry.html_body);
```

**Solution:**
- Verify `onChange` is passing HTML (not plain text)
- Check database stores `html_body` field
- Ensure editor uses `getContentHtml()` not plain text extraction

### Issue: Character Limit Not Enforcing

**Symptoms:**
- Can type past limit
- No visual warning

**Diagnosis:**
```typescript
// Check editor props
<RichTextEditor
  characterLimit={280} // Ensure this is set
  showCharacterCount={true} // Ensure this is true
/>
```

**Solution:**
- Verify `characterLimit` prop passed to editor
- Check `showCharacterCount` is enabled
- Ensure `handleChange` has limit enforcement logic

### Issue: Auto-Save Not Triggering

**Symptoms:**
- No save after waiting
- Content lost on app close

**Diagnosis:**
```typescript
// Check auto-save hook
const { saveNow, isSaving } = useAutoSave(entry, {
  onSave: saveEntry,
  delay: 2000,
  enabled: enableAutoSave && !!entry.trim(), // Check this condition
});
```

**Solution:**
- Ensure `enabled` condition is true
- Verify `entry` state is updating
- Check `onSave` callback is defined
- Verify delay timing (2000ms = 2 seconds)

### Issue: Editor Not Scrolling

**Symptoms:**
- Long content goes off screen
- Can't scroll to see all text

**Solution:**
```typescript
// Ensure editor is in ScrollView or has proper height
<RichEditor
  initialHeight={200}
  // Editor should expand as content grows
/>
```

### Issue: Toolbar Buttons Not Working

**Symptoms:**
- Tapping Bold doesn't apply formatting
- No visual feedback

**Diagnosis:**
- Check `richTextRef` is connected
- Verify toolbar `editor` prop

**Solution:**
```typescript
<RichToolbar
  editor={richTextRef} // Must reference the same ref as RichEditor
  actions={[
    actions.setBold,
    actions.setItalic,
    // ...
  ]}
/>
```

## Automated Testing

Example unit tests for HTML utilities:

```typescript
// __tests__/utils/html.test.ts
import {
  htmlToPlainText,
  countHtmlCharacters,
  isHtmlEmpty,
  createTextPreview,
  truncateHtml
} from '@/utils/html';

describe('HTML Utilities', () => {
  describe('htmlToPlainText', () => {
    it('removes HTML tags', () => {
      expect(htmlToPlainText('<p>Hello</p>')).toBe('Hello');
    });

    it('decodes HTML entities', () => {
      expect(htmlToPlainText('AT&amp;T')).toBe('AT&T');
    });

    it('normalizes whitespace', () => {
      expect(htmlToPlainText('Too    many   spaces')).toBe('Too many spaces');
    });

    it('handles empty strings', () => {
      expect(htmlToPlainText('')).toBe('');
    });
  });

  describe('countHtmlCharacters', () => {
    it('counts plain text characters', () => {
      expect(countHtmlCharacters('Hello World')).toBe(11);
    });

    it('excludes HTML tags from count', () => {
      expect(countHtmlCharacters('<strong>Hello World</strong>')).toBe(11);
    });

    it('handles nested tags', () => {
      expect(countHtmlCharacters('<p><strong>Bold</strong> text</p>')).toBe(9);
    });

    it('returns 0 for empty content', () => {
      expect(countHtmlCharacters('')).toBe(0);
      expect(countHtmlCharacters('<p></p>')).toBe(0);
    });
  });

  describe('isHtmlEmpty', () => {
    it('returns true for empty strings', () => {
      expect(isHtmlEmpty('')).toBe(true);
    });

    it('returns true for whitespace only', () => {
      expect(isHtmlEmpty('   ')).toBe(true);
    });

    it('returns true for empty tags', () => {
      expect(isHtmlEmpty('<p></p><div></div>')).toBe(true);
    });

    it('returns false for content', () => {
      expect(isHtmlEmpty('<p>Content</p>')).toBe(false);
    });
  });

  describe('createTextPreview', () => {
    it('returns full text if under limit', () => {
      expect(createTextPreview('<p>Short</p>', 150)).toBe('Short');
    });

    it('truncates long text', () => {
      const long = '<p>' + 'A'.repeat(200) + '</p>';
      const preview = createTextPreview(long, 150);
      expect(preview.length).toBeLessThanOrEqual(153); // 150 + "..."
      expect(preview).toMatch(/\.\.\.$/);
    });

    it('strips HTML from preview', () => {
      const preview = createTextPreview('<h1>Title</h1><p>Body</p>', 20);
      expect(preview).not.toContain('<');
      expect(preview).not.toContain('>');
    });
  });
});
```

## Performance Testing

### Test 39: Large Entry Performance

**Steps:**
1. Create entry with 5,000 characters
2. Apply formatting to various sections
3. Measure:
   - Typing latency
   - Scroll smoothness
   - Save duration
   - Load duration

**Expected Performance:**
- ✅ Typing latency < 50ms
- ✅ Smooth scrolling (60fps)
- ✅ Save < 1 second
- ✅ Load < 1 second

### Test 40: Multiple Rapid Saves

**Steps:**
1. Type content
2. Trigger 10 rapid saves in succession
3. Observe behavior

**Expected Results:**
- ✅ No race conditions
- ✅ Final save contains latest content
- ✅ No database corruption
- ✅ No memory leaks

## Next Steps

After completing rich text editor testing:

1. ✅ Mark task 9.6 as complete in tasks-prd.md
2. Document any platform-specific rendering differences
3. Update user documentation with formatting tips
4. Proceed to task 9.7 (entry details navigation flow testing)

## Additional Resources

- [react-native-pell-rich-editor Documentation](https://github.com/wxik/react-native-rich-editor)
- [Rich Text Editor Best Practices](https://www.nngroup.com/articles/rich-text-editors/)
- [HTML Sanitization](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [React Native TextInput](https://reactnative.dev/docs/textinput)
