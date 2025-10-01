import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Edit3, Save, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { DatabaseService } from '@/services/database';
import { BackupService } from '@/services/backup';
import { WidgetService } from '@/services/widget';
import { RichTextEditor, type RichTextEditorRef } from '@/components/organisms/RichTextEditor';
import { useAutoSave } from '@/hooks/useAutoSave';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { showErrorAlert, logError } from '@/utils/errorHandling';

export default function EntryDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const richTextRef = useRef<RichTextEditorRef>(null);

  const [entry, setEntry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [enableAutoSave, setEnableAutoSave] = useState(false);

  useEffect(() => {
    loadEntry();
  }, [date]);

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
      }
    } catch (error) {
      logError(error, 'EntryDetailScreen.loadEntry');
      showErrorAlert(error, 'Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async (content: string) => {
    if (!entry || !content.trim()) return;

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      await DatabaseService.updateEntry(entry.id, content.trim());

      // Update local state
      setEntry({ ...entry, html_body: content.trim() });

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
    enabled: enableAutoSave && isEditMode && !!editedContent.trim(),
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
    if (editedContent.trim()) {
      try {
        await saveNow();
        setIsEditMode(false);
        setEnableAutoSave(false);
        Alert.alert('Saved!', 'Your changes have been saved.');
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
    if (!editedContent.trim()) return;

    try {
      await saveNow();
      Alert.alert('Saved!', 'Your journal entry has been saved.');
    } catch (error) {
      logError(error, 'EntryDetailScreen.handleManualSave');
      showErrorAlert(error, 'Save Error', {
        retryAction: handleManualSave,
        retryButtonText: 'Try Again',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading entry...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No entry found for this date</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F8FAFC', '#F1F5F9']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={24} color="#1E293B" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.dateText}>{formatDate(entry.entry_date)}</Text>
          </View>

          {!isEditMode ? (
            <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
              <Edit3 size={20} color="#6366F1" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSaveAndExit}
              style={styles.saveIconButton}
              disabled={isSaving}
            >
              <Save size={20} color="#10B981" />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {!isEditMode ? (
          <ScrollView style={styles.contentContainer} contentContainerStyle={styles.contentScrollView}>
            <View style={styles.contentCard}>
              <RenderHtml
                contentWidth={width - 96}
                source={{ html: entry.html_body }}
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
              showSaveButton={true}
              isSaving={isSaving}
            />
          </View>
        )}

        {/* Edit Mode Bottom Actions */}
        {isEditMode && (
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={[styles.saveButton, { opacity: editedContent.trim() ? 1 : 0.5 }]}
              onPress={handleManualSave}
              disabled={!editedContent.trim() || isSaving}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.saveButtonGradient}
              >
                <Save size={20} color="white" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#64748B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  saveIconButton: {
    padding: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  dateText: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    color: '#1E293B',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  contentScrollView: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  contentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  htmlContent: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: '#1E293B',
  },
  editorContainer: {
    flex: 1,
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  richTextEditor: {
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
});
