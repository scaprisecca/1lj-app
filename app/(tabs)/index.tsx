import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Save, Heart, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { DatabaseService } from '@/services/database';
import { BackupService } from '@/services/backup';
import { isUsingMock } from '@/lib/database/client';

export default function TodayScreen() {
  const [entry, setEntry] = useState('');
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayEntry();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const existingEntry = await DatabaseService.getEntryByDate(today);
      if (existingEntry) {
        setTodayEntry(existingEntry);
        setEntry(existingEntry.content);
      }
    } catch (error) {
      console.error('Error loading today entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = async () => {
    if (!entry.trim()) return;
    
    setIsSaving(true);
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      if (todayEntry) {
        await DatabaseService.updateEntry(todayEntry.id, entry.trim());
      } else {
        const newEntry = await DatabaseService.createEntry(today, entry.trim());
        setTodayEntry(newEntry);
      }

      // Trigger backup (will be mocked if not available)
      await BackupService.createBackup();
      
      Alert.alert('Saved!', 'Your journal entry has been saved to demo storage.');
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save your entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
        {/* Demo Mode Warning - Always show since we're always in mock mode */}
        <View style={styles.warningContainer}>
          <AlertTriangle size={16} color="#F59E0B" />
          <Text style={styles.warningText}>
            🚀 Demo Mode: App is working! Data is temporary and won't persist between sessions. Use Expo Development Client for full functionality.
          </Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.dateText}>{formatDate(today)}</Text>
          <Text style={styles.subtitle}>How was your day? Write as much as you'd like!</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={entry}
            onChangeText={setEntry}
            placeholder="Write about your day... You can add as many details as you'd like throughout the day."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            scrollEnabled={true}
          />
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.saveButton, { opacity: entry.trim() ? 1 : 0.5 }]}
            onPress={saveEntry}
            disabled={!entry.trim() || isSaving}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.saveButtonGradient}
            >
              <Save size={20} color="white" />
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Entry'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.motivationContainer}>
            <Heart size={16} color="#F59E0B" />
            <Text style={styles.motivationText}>
              Every day is a new page in your story
            </Text>
          </View>
        </View>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  dateText: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748B',
  },
  inputContainer: {
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
  textInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1E293B',
    lineHeight: 24,
    flex: 1,
    textAlignVertical: 'top',
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  motivationText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#92400E',
    marginLeft: 8,
  },
});