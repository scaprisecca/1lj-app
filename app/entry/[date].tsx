import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { ArrowLeft, Edit3, Save, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { DatabaseService } from '@/services/database';
import { BackupService } from '@/services/backup';
import { WidgetService } from '@/services/widget';
import { RichTextEditor, type RichTextEditorRef } from '@/components/organisms/RichTextEditor';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useToast } from '@/components/atoms/Toast';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { SettingsService } from '@/services/settings';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { showErrorAlert, logError } from '@/utils/errorHandling';
import type { JournalEntry } from '@/lib/database/schema';
import { formatDateString } from '@/lib/utils/date';
import { fonts, radii, shadows, spacing, ThemeColors } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';

export default function EntryDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const richTextRef = useRef<RichTextEditorRef>(null);

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [enableAutoSave, setEnableAutoSave] = useState<boolean>(false);
  const [characterLimit, setCharacterLimit] = useState<number | undefined>(undefined);
  const [characterCount, setCharacterCount] = useState<number>(0);
  const { showToast } = useToast();
  const isOverLimit = characterLimit !== undefined && characterCount > characterLimit;

  useEffect(() => {
    loadEntry();
  }, [date]);

  useEffect(() => {
    SettingsService.getSetting('characterLimit').then(setCharacterLimit);
  }, []);

  const loadEntry = async () => {
    if (!date) {
      setIsLoading(false);
      return;
    }

    try {
      const existingEntry = await DatabaseService.getEntryByDate(date as string);
      if (existingEntry) {
        setEntry(existingEntry);
        setEditedContent(existingEntry.html_body);
      } else {
        setIsEditMode(true);
        setEnableAutoSave(true);
      }
    } catch (error) {
      logError(error, 'EntryDetailScreen.loadEntry');
      showErrorAlert(error, 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async (content: string) => {
    if (!content.trim()) return;

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (!entry) {
        const newEntry = await DatabaseService.createEntry(date as string, content.trim());
        setEntry(newEntry);
        setEditedContent(newEntry.html_body);
      } else {
        await DatabaseService.updateEntry(entry.id, content.trim());
        setEntry({ ...entry, html_body: content.trim() });
      }

      // Trigger backup (don't block on errors)
      BackupService.createBackup().catch((err) => {
        logError(err, 'EntryDetailScreen.saveEntry.backup');
      });

      // Update widget data (don't block on errors)
      WidgetService.updateWidgetData().catch((err) => {
        logError(err, 'EntryDetailScreen.saveEntry.widget');
      });
    } catch (error) {
      logError(error, 'EntryDetailScreen.saveEntry');
      throw error; // Re-throw to be caught by auto-save hook
    }
  };

  // Auto-save hook
  const { saveNow, isSaving, lastSaved, error: saveError } = useAutoSave(editedContent, {
    onSave: saveEntry,
    delay: 2000,
    enabled: enableAutoSave && isEditMode && !!editedContent.trim() && !isOverLimit,
    onSaveSuccess: () => {
      console.log('Auto-saved successfully');
    },
    onSaveError: (error) => {
      logError(error, 'EntryDetailScreen.autoSave');
      showErrorAlert(error, 'Auto-Save Error', {
        dismissButtonText: 'OK',
      });
    },
  });

  const handleEditPress = () => {
    setIsEditMode(true);
    setEnableAutoSave(true);
    // Set initial content in the editor
    setTimeout(() => {
      richTextRef.current?.setContentHTML(editedContent);
    }, 100);
  };

  const handleSaveAndExit = async () => {
    if (isOverLimit) return;

    if (editedContent.trim()) {
      try {
        await saveNow();
        setIsEditMode(false);
        setEnableAutoSave(false);
        showToast('Changes saved');
      } catch (error) {
        logError(error, 'EntryDetailScreen.handleSaveAndExit');
        showErrorAlert(error, 'Save Error', {
          retryAction: handleSaveAndExit,
          retryButtonText: 'Try Again',
        });
      }
    } else {
      setIsEditMode(false);
      setEnableAutoSave(false);
    }
  };

  const handleRichTextChange = (html: string) => {
    setEditedContent(html);
  };

  const handleRichTextBlur = async () => {
    // Save on blur if there's content
    if (editedContent.trim()) {
      await saveNow();
    }
  };

  const handleManualSave = async () => {
    if (!editedContent.trim() || isOverLimit) return;

    try {
      await saveNow();
      showToast('Entry saved');
    } catch (error) {
      logError(error, 'EntryDetailScreen.handleManualSave');
      showErrorAlert(error, 'Save Error', {
        retryAction: handleManualSave,
        retryButtonText: 'Try Again',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateString(dateString, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  usePreventRemove(isEditMode, ({ data }) => {
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
            navigation.dispatch(data.action);
          }
        },
        {
          text: 'Save',
          onPress: async () => {
            await saveNow();
            setIsEditMode(false);
            navigation.dispatch(data.action);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  });

  const handleDeletePress = () => {
    if (!entry) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteEntry(entry.id);
              router.back();
            } catch (error) {
              logError(error, 'EntryDetailScreen.handleDeletePress');
              showErrorAlert(error, 'Delete Error');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
          <Text style={styles.loadingText}>Loading entry...</Text>
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.dateText}>{formatDate(entry?.entry_date ?? (date as string))}</Text>
          </View>

          {!isEditMode ? (
            <View style={styles.headerActions}>
              {entry && (
                <TouchableOpacity
                  onPress={handleDeletePress}
                  style={styles.deleteButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete entry"
                >
                  <Trash2 size={20} color={colors.danger} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleEditPress}
                style={styles.editButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Edit entry"
              >
                <Edit3 size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSaveAndExit}
              style={[styles.saveIconButton, isOverLimit && styles.saveIconButtonDisabled]}
              disabled={isSaving || isOverLimit}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Save and exit"
              accessibilityState={{ disabled: isSaving || isOverLimit }}
            >
              <Save size={20} color={isOverLimit ? colors.textMuted : colors.success} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {!isEditMode ? (
          <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentScrollView}>
            <View style={styles.contentCard}>
              <RenderHtml
                contentWidth={width - 96}
                source={{ html: entry?.html_body ?? '' }}
                baseStyle={styles.htmlContent}
              />
            </View>
          </ScrollView>
        ) : (
          <View style={styles.editorContainer}>
            <RichTextEditor
              ref={richTextRef}
              value={editedContent}
              onChange={handleRichTextChange}
              onBlur={handleRichTextBlur}
              onSave={handleManualSave}
              placeholder="Write about your day..."
              style={styles.richTextEditor}
              showCharacterCount={true}
              characterLimit={characterLimit}
              onCharacterCountChange={setCharacterCount}
              showSaveButton={true}
              saveDisabled={isOverLimit}
              isSaving={isSaving}
            />
          </View>
        )}

        {/* Edit Mode Bottom Actions */}
        {isEditMode && (
          <View style={styles.bottomContainer}>
            {isOverLimit && (
              <Text style={styles.overLimitText}>
                {characterCount - (characterLimit as number)} characters over limit
              </Text>
            )}
            <TouchableOpacity
              style={[styles.saveButton, { opacity: editedContent.trim() ? 1 : 0.5 }]}
              onPress={handleManualSave}
              disabled={!editedContent.trim() || isSaving || isOverLimit}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
              accessibilityState={{ disabled: !editedContent.trim() || isSaving || isOverLimit }}
            >
              <LinearGradient
                colors={colors.gradient}
                style={styles.saveButtonGradient}
              >
                <Save size={20} color={colors.white} />
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.sm,
    backgroundColor: colors.borderLight,
    borderRadius: radii.md,
  },
  editButton: {
    padding: spacing.sm,
    backgroundColor: colors.indigoTint,
    borderRadius: radii.md,
  },
  saveIconButton: {
    padding: spacing.sm,
    backgroundColor: colors.successTint,
    borderRadius: radii.md,
  },
  saveIconButtonDisabled: {
    backgroundColor: colors.borderLight,
  },
  dateText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  contentScrollView: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    ...shadows.card,
  },
  htmlContent: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  editorContainer: {
    flex: 1,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  richTextEditor: {
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  saveButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  saveButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.white,
    marginLeft: spacing.sm,
  },
  overLimitText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
