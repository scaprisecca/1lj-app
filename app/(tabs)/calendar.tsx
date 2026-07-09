import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Plus, ChevronDown, X, CalendarCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CalendarGrid } from '@/components/molecules/CalendarGrid';
import { HistoryCard } from '@/components/molecules/HistoryCard';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { ErrorMessage } from '@/components/atoms/ErrorMessage';
import { EmptyState } from '@/components/atoms/EmptyState';
import { DatabaseService } from '@/services/database';
import type { JournalEntry } from '@/lib/database/schema';
import { formatDateString } from '@/lib/utils/date';
import { colors, fonts, radii, shadows, spacing } from '@/lib/theme';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_DIRECTION_RATIO = 2;

export default function CalendarScreen() {
  const router = useRouter();
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
    const entry = entries.find(e => e.entry_date === date);
    setSelectedEntry(entry ?? null);
  };

  const handleCreateEntry = () => {
    if (!selectedDate) return;
    router.push(`/entry/${selectedDate}`);
  };

  const navigateToEntry = (date: string) => {
    router.push(`/entry/${date}`);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  };

  const isCurrentMonth = () => {
    const today = new Date();
    return currentDate.getFullYear() === today.getFullYear() &&
      currentDate.getMonth() === today.getMonth();
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate('');
    setSelectedEntry(null);
  };

  const handleYearSelect = (year: number) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setSelectedDate('');
    setSelectedEntry(null);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
    setSelectedDate('');
    setSelectedEntry(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 20 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * SWIPE_DIRECTION_RATIO
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_DISTANCE_THRESHOLD) {
          navigateMonth('prev');
        } else if (gestureState.dx < -SWIPE_DISTANCE_THRESHOLD) {
          navigateMonth('next');
        }
      },
    })
  ).current;

  const renderYearItem = ({ item: year }: { item: number }) => {
    const isCurrentYear = year === currentDate.getFullYear();
    
    return (
      <TouchableOpacity
        style={[styles.yearItem, isCurrentYear && styles.yearItemSelected]}
        onPress={() => handleYearSelect(year)}
        accessibilityRole="button"
        accessibilityLabel={`${year}`}
        accessibilityState={{ selected: isCurrentYear }}
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

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const daysElapsed = isCurrentMonth() ? new Date().getDate() : daysInMonth;
  const completionPercent = Math.round((entries.length / daysElapsed) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <ChevronLeft size={24} color={colors.primary} />
            </TouchableOpacity>

            {/* Make month/year text clickable */}
            <TouchableOpacity
              style={styles.monthTextContainer}
              onPress={() => setShowYearPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`${formatMonthYear(currentDate)}, choose month or year`}
            >
              <Text style={styles.monthText}>{formatMonthYear(currentDate)}</Text>
              <ChevronDown size={20} color={colors.primary} style={styles.dropdownIcon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navButton}
              onPress={() => navigateMonth('next')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Next month"
            >
              <ChevronRight size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Today Button — space is always reserved so the grid below doesn't shift */}
          <TouchableOpacity
            style={[styles.todayButton, isCurrentMonth() && styles.todayButtonHidden]}
            onPress={goToToday}
            disabled={isCurrentMonth()}
            accessibilityElementsHidden={isCurrentMonth()}
            importantForAccessibility={isCurrentMonth() ? 'no-hide-descendants' : 'yes'}
            accessibilityRole="button"
            accessibilityLabel="Go to today"
          >
            <CalendarCheck size={14} color={colors.primary} />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>

          {/* Calendar Grid */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={32} />
              <Text style={styles.loadingText}>Loading calendar...</Text>
            </View>
          ) : (
            <View {...panResponder.panHandlers}>
              <CalendarGrid
                year={currentDate.getFullYear()}
                month={currentDate.getMonth() + 1}
                entries={entries}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
              />
            </View>
          )}

          {/* Selected Date Info */}
          {selectedDate && (
            <View style={styles.selectedDateContainer}>
              <Text style={styles.selectedDateTitle}>
                {formatDateString(selectedDate, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              
              {selectedEntry ? (
                <HistoryCard
                  entry={selectedEntry}
                  onPress={() => navigateToEntry(selectedEntry.entry_date)}
                  showDate={false}
                />
              ) : (
                <EmptyState
                  icon={<Plus size={28} color={colors.primary} />}
                  title="No entry for this date"
                  actionLabel="Create Entry"
                  onAction={handleCreateEntry}
                />
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
                <Text style={styles.statNumber}>{completionPercent}%</Text>
                <Text style={styles.statLabel}>Days Journaled</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Month/Year Picker Modal */}
        <Modal
          visible={showYearPicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowYearPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Jump to Month</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowYearPicker(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionLabel}>Month</Text>
              <View style={styles.monthGrid}>
                {MONTH_LABELS.map((label, index) => {
                  const isCurrentSelection = index === currentDate.getMonth();
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[styles.monthGridItem, isCurrentSelection && styles.monthGridItemSelected]}
                      onPress={() => handleMonthSelect(index)}
                      accessibilityRole="button"
                      accessibilityLabel={label}
                      accessibilityState={{ selected: isCurrentSelection }}
                    >
                      <Text
                        style={[
                          styles.monthGridItemText,
                          isCurrentSelection && styles.monthGridItemTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.modalSectionLabel}>Year</Text>
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
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: radii.xxl + 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.button,
  },
  // Updated: Make month text container clickable
  monthTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.button,
  },
  monthText: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.text,
  },
  // New: Dropdown icon for year picker
  dropdownIcon: {
    marginLeft: spacing.sm,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.xxl,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: spacing.lg,
    gap: 6,
    ...shadows.low,
  },
  todayButtonHidden: {
    opacity: 0,
  },
  todayButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  selectedDateContainer: {
    paddingVertical: spacing.xxl,
  },
  selectedDateTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  statsContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  statsTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  // New: Year picker modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    width: '85%',
    maxHeight: '80%',
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalSectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  monthGridItem: {
    width: '25%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthGridItemSelected: {
    backgroundColor: colors.indigoTint,
    borderRadius: radii.md,
  },
  monthGridItemText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  monthGridItemTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
  yearList: {
    maxHeight: 300,
  },
  yearItem: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  yearItemSelected: {
    backgroundColor: colors.blueTint,
  },
  yearText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  yearTextSelected: {
    fontFamily: fonts.semiBold,
    color: colors.primary,
  },
});