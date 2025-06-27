import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Plus, ChevronDown, X } from 'lucide-react-native';
import { CalendarGrid } from '@/components/molecules/CalendarGrid';
import { HistoryCard } from '@/components/molecules/HistoryCard';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { ErrorMessage } from '@/components/atoms/ErrorMessage';
import { DatabaseService } from '@/services/database';
import type { JournalEntry } from '@/lib/database/schema';

export default function CalendarScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Generate a range of years (current year back to 10 years ago, and 2 years forward)
  const generateYearList = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    // Add years from 10 years ago to 2 years in the future
    for (let year = currentYear - 10; year <= currentYear + 2; year++) {
      years.push(year);
    }
    return years.reverse(); // Most recent years first
  };

  useEffect(() => {
    loadEntriesForMonth();
  }, [currentDate]);

  const loadEntriesForMonth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const monthEntries = await DatabaseService.getEntriesForMonth(year, month);
      setEntries(monthEntries);
    } catch (err) {
      setError('Failed to load calendar entries');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
    setSelectedDate('');
    setSelectedEntry(null);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    const entry = entries.find(e => e.date === date);
    setSelectedEntry(entry || null);
  };

  const handleCreateEntry = () => {
    if (!selectedDate) return;
    
    Alert.alert(
      'Create Entry',
      `Create a journal entry for ${new Date(selectedDate).toLocaleDateString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: () => navigateToEntry(selectedDate) }
      ]
    );
  };

  const navigateToEntry = (date: string) => {
    // In a real implementation, you'd navigate to the entry creation/editing screen
    console.log('Navigate to entry for date:', date);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setShowYearPicker(false);
    setSelectedDate('');
    setSelectedEntry(null);
  };

  const renderYearItem = ({ item: year }: { item: number }) => {
    const isCurrentYear = year === currentDate.getFullYear();
    
    return (
      <TouchableOpacity
        style={[styles.yearItem, isCurrentYear && styles.yearItemSelected]}
        onPress={() => handleYearSelect(year)}
      >
        <Text style={[styles.yearText, isCurrentYear && styles.yearTextSelected]}>
          {year}
        </Text>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorMessage message={error} onRetry={loadEntriesForMonth} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.gradient}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Calendar</Text>
            <Text style={styles.subtitle}>View your journal entries by date</Text>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('prev')}
            >
              <ChevronLeft size={24} color="#6366F1" />
            </TouchableOpacity>
            
            {/* Make month/year text clickable */}
            <TouchableOpacity 
              style={styles.monthTextContainer}
              onPress={() => setShowYearPicker(true)}
            >
              <Text style={styles.monthText}>{formatMonthYear(currentDate)}</Text>
              <ChevronDown size={20} color="#6366F1" style={styles.dropdownIcon} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('next')}
            >
              <ChevronRight size={24} color="#6366F1" />
            </TouchableOpacity>
          </View>

          {/* Calendar Grid */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={32} />
              <Text style={styles.loadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <CalendarGrid
              year={currentDate.getFullYear()}
              month={currentDate.getMonth() + 1}
              entries={entries}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          )}

          {/* Selected Date Info */}
          {selectedDate && (
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateTitle}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              
              {selectedEntry ? (
                <HistoryCard 
                  entry={selectedEntry} 
                  onPress={() => navigateToEntry(selectedEntry.date)}
                  showDate={false}
                />
              ) : (
                <View style={styles.noEntryContainer}>
                  <Text style={styles.noEntryText}>No entry for this date</Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={handleCreateEntry}
                  >
                    <LinearGradient
                      colors={['#6366F1', '#8B5CF6']}
                      style={styles.createButtonGradient}
                    >
                      <Plus size={16} color="white" />
                      <Text style={styles.createButtonText}>Create Entry</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Monthly Stats */}
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>This Month</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{entries.length}</Text>
                <Text style={styles.statLabel}>Entries</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {Math.round((entries.length / new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()) * 100)}%
                </Text>
                <Text style={styles.statLabel}>Completion</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Year Picker Modal */}
        <Modal
          visible={showYearPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Year</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowYearPicker(false)}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={generateYearList()}
                renderItem={renderYearItem}
                keyExtractor={(item) => item.toString()}
                style={styles.yearList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
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
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  // Updated: Make month text container clickable
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  monthText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1E293B',
  },
  // New: Dropdown icon for year picker
  dropdownIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  selectedDateContainer: {
    paddingVertical: 24,
  },
  selectedDateTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  noEntryContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  noEntryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 16,
  },
  createButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  createButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#6366F1',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  // New: Year picker modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  yearList: {
    maxHeight: 300,
  },
  yearItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  yearItemSelected: {
    backgroundColor: '#F0F7FF',
  },
  yearText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  yearTextSelected: {
    fontFamily: 'Inter-SemiBold',
    color: '#6366F1',
  },
});