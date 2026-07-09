import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, Platform, ActivityIndicator, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Save, Heart, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import RenderHtml from 'react-native-render-html';
import { DatabaseService } from '@/services/database';
import { BackupService } from '@/services/backup';
import { WidgetService } from '@/services/widget';
import { isUsingMock } from '@/lib/database/client';
import { RichTextEditor, type RichTextEditorRef } from '@/components/organisms/RichTextEditor';
import { RichToolbar, actions, RichEditor } from 'react-native-pell-rich-editor';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useToast } from '@/components/atoms/Toast';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { SettingsService } from '@/services/settings';
import type { JournalEntry } from '@/lib/database/schema';
import { getTodayString, formatDateString } from '@/lib/utils/date';
import { colors, fonts, radii, shadows, spacing } from '@/lib/theme';

const PREVIEW_MAX_HEIGHT = 120;

export default function TodayScreen() {
  const [entry, setEntry] = useState<string>('');
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enableAutoSave, setEnableAutoSave] = useState<boolean>(false);
  const [hasSavedContent, setHasSavedContent] = useState<boolean>(false);
  const [characterLimit, setCharacterLimit] = useState<number | undefined>(undefined);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const richTextRef = useRef<RichTextEditorRef>(null);
  const externalEditorRef = useRef<RichEditor>(null);
  const savedBodyRef = useRef<string>('');
  const motivationOpacity = useRef(new Animated.Value(1)).current;
  const { showToast } = useToast();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const today = getTodayString();
  const isOverLimit = characterLimit !== undefined && characterCount > characterLimit;
  const isEmpty = !entry.trim();

  useEffect(() => {
    Animated.timing(motivationOpacity, {
      toValue: isEmpty ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isEmpty, motivationOpacity]);

  useEffect(() => {
    loadTodayEntry();
    SettingsService.getSetting('characterLimit').then(setCharacterLimit);
  }, []);

  const loadTodayEntry = async () => {
    try {
      setIsLoading(true);
      const existingEntry = await DatabaseService.getEntryByDate(today);
      if (existingEntry) {
        setTodayEntry(existingEntry);
        savedBodyRef.current = existingEntry.html_body;
        setHasSavedContent(true);
        // Editor starts empty — existing content is the "base" for appending
      }
      // Enable auto-save after initial load
      setEnableAutoSave(true);
    } catch (error) {
      console.error('Error loading today entry:', error);
      Alert.alert('Error', 'Failed to load your entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async (content: string) => {
    if (!content.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const combinedContent = savedBodyRef.current
      ? `${savedBodyRef.current}<br><br>${content.trim()}`
      : content.trim();

    if (todayEntry) {
      await DatabaseService.updateEntry(todayEntry.id, combinedContent);
    } else {
      const newEntry = await DatabaseService.createEntry(today, combinedContent);
      setTodayEntry(newEntry);
    }

    // Trigger backup (will be mocked if not available)
    await BackupService.createBackup();

    // Update widget data
    await WidgetService.updateWidgetData();
  };

  // Auto-save hook
  const { saveNow, isSaving, lastSaved, error: saveError } = useAutoSave(entry, {
    onSave: saveEntry,
    delay: 2000,
    enabled: enableAutoSave && !!entry.trim(),
    onSaveSuccess: () => {
      console.log('Auto-saved successfully');
    },
    onSaveError: (error) => {
      console.error('Auto-save error:', error);
      Alert.alert('Save Error', 'Failed to auto-save your entry. Please try saving manually.');
    },
  });

  const handleRichTextChange = (html: string) => {
    setEntry(html);
  };

  const handleRichTextBlur = async () => {
    // Save on blur if there's content
    if (entry.trim()) {
      await saveNow();
    }
  };

  const handleManualSave = async () => {
    if (!entry.trim() || isOverLimit) return;

    try {
      await saveNow();
      // Advance the base to include what was just saved
      savedBodyRef.current = savedBodyRef.current
        ? `${savedBodyRef.current}<br><br>${entry.trim()}`
        : entry.trim();
      setHasSavedContent(true);
      // Clear editor for next note
      setEntry('');
      richTextRef.current?.setContentHTML('');
      showToast('Entry saved');
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save your entry. Please try again.');
    }
  };

  const formatDate = (date: string) => {
    return formatDateString(date, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return null;

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 10) return 'just now';
    if (diffSecs < 60) return `${diffSecs} seconds ago`;
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading your entry...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={colors.backgroundGradient}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {isUsingMock() && (
            <View style={styles.warningContainer}>
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={styles.warningText}>
                Demo mode — data won&apos;t persist. Use a development build for full functionality.
              </Text>
            </View>
          )}

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.dateText}>{formatDate(today)}</Text>
              {/* Save status indicator */}
              {entry.trim() && (
                saveError ? (
                  <TouchableOpacity
                    style={styles.saveStatusContainer}
                    onPress={handleManualSave}
                    accessibilityRole="button"
                    accessibilityLabel="Save failed, tap to retry"
                  >
                    <AlertTriangle size={14} color={colors.danger} />
                    <Text style={styles.saveStatusTextError}>
                      Save failed - tap to retry
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.saveStatusContainer}>
                    {isSaving ? (
                      <>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.saveStatusText}>Saving...</Text>
                      </>
                    ) : lastSaved ? (
                      <>
                        <CheckCircle2 size={14} color={colors.success} />
                        <Text style={styles.saveStatusTextSaved}>
                          Saved {formatLastSaved(lastSaved)}
                        </Text>
                      </>
                    ) : null}
                  </View>
                )
              )}
            </View>
            <Text style={styles.subtitle}>
              {hasSavedContent
                ? 'You have notes today — add more below'
                : 'How was your day? Write with rich formatting!'}
            </Text>
          </View>

          {hasSavedContent && (
            <TouchableOpacity
              style={styles.previewContainer}
              onPress={() => router.push(`/entry/${today}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="View full entry for today"
            >
              <View style={styles.previewHeader}>
                <Text style={styles.previewLabel}>Today so far</Text>
                <View style={styles.previewLinkContainer}>
                  <Text style={styles.previewLink}>View full entry</Text>
                  <ChevronRight size={14} color={colors.primary} />
                </View>
              </View>
              <View style={styles.previewBody}>
                <RenderHtml
                  contentWidth={width - 88}
                  source={{ html: savedBodyRef.current }}
                  baseStyle={styles.previewHtml}
                />
                <LinearGradient
                  colors={['transparent', colors.white]}
                  style={styles.previewFade}
                  pointerEvents="none"
                />
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.inputContainer}>
            <RichTextEditor
              ref={richTextRef}
              editorRef={externalEditorRef}
              value={entry}
              onChange={handleRichTextChange}
              onBlur={handleRichTextBlur}
              onSave={handleManualSave}
              placeholder="Write about your day... Use the toolbar above the keyboard to format your text."
              style={styles.richTextEditor}
              showCharacterCount={true}
              characterLimit={characterLimit}
              onCharacterCountChange={setCharacterCount}
              showSaveButton={false}
              showToolbar={false}
              isSaving={isSaving}
            />
          </View>

          {/* Sticky toolbar — stays above keyboard */}
          <View style={styles.stickyToolbar}>
            <RichToolbar
              editor={externalEditorRef}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.heading1,
                actions.heading2,
                actions.setParagraph,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.undo,
                actions.redo,
              ]}
              iconTint={colors.primary}
              selectedIconTint={colors.primaryDark}
              style={styles.toolbar}
              flatContainerStyle={styles.toolbarContainer}
            />
          </View>

          <View style={styles.bottomContainer}>
            {isOverLimit && (
              <Text style={styles.overLimitText}>
                {characterCount - (characterLimit as number)} characters over limit
              </Text>
            )}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleManualSave}
              disabled={isEmpty || isSaving || isOverLimit}
              accessibilityRole="button"
              accessibilityLabel="Save entry"
              accessibilityState={{ disabled: isEmpty || isSaving || isOverLimit }}
            >
              <LinearGradient
                colors={isEmpty ? [colors.disabled, colors.disabled] : colors.gradient}
                style={styles.saveButtonGradient}
              >
                <Save size={20} color={colors.white} />
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Entry'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Animated.View style={[styles.motivationContainer, { opacity: motivationOpacity }]}>
              <Heart size={16} color={colors.warning} />
              <Text style={styles.motivationText}>
                Every day is a new page in your story
              </Text>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textSecondary,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  dateText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  saveStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  saveStatusText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    marginLeft: 6,
  },
  saveStatusTextSaved: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.success,
    marginLeft: 6,
  },
  saveStatusTextError: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    marginLeft: 6,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  previewContainer: {
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  previewLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLink: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    marginRight: 2,
  },
  previewBody: {
    maxHeight: PREVIEW_MAX_HEIGHT,
    overflow: 'hidden',
  },
  previewHtml: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textBody,
  },
  previewFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 32,
  },
  richTextEditor: {
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  saveButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  saveButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.warning,
    marginLeft: spacing.sm,
  },
  overLimitText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stickyToolbar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolbar: {
    backgroundColor: colors.background,
    minHeight: 50,
  },
  toolbarContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningTint,
    padding: spacing.sm,
    marginHorizontal: spacing.xxl,
    marginTop: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  warningText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.warningText,
    marginLeft: spacing.sm,
  },
});