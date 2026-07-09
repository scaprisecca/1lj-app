import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { JournalEntry } from '@/lib/database/schema';
import { getTodayString } from '@/lib/utils/date';
import { colors, fonts, radii, shadows, spacing } from '@/lib/theme';

interface CalendarGridProps {
  year: number;
  month: number;
  entries: JournalEntry[];
  selectedDate?: string;
  onDateSelect: (date: string) => void;
}

export function CalendarGrid({ year, month, entries, selectedDate, onDateSelect }: CalendarGridProps) {
  const screenWidth = Dimensions.get('window').width;
  const cellSize = (screenWidth - 80) / 7; // 24px margin + 16px padding on each side
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  
  const entryDates = new Set(entries.map(entry => entry.entry_date));
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = getTodayString();
  
  const renderDay = (day: number) => {
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const hasEntry = entryDates.has(date);
    const isSelected = date === selectedDate;
    const isToday = date === today;
    
    return (
      <TouchableOpacity
        key={day}
        style={[styles.dayCell, { width: cellSize, height: cellSize }]}
        onPress={() => onDateSelect(date)}
      >
        <View style={[
          styles.dayContent,
          isToday && styles.todayContent,
          isSelected && styles.selectedContent,
        ]}>
          {isSelected ? (
            <LinearGradient
              colors={colors.gradient}
              style={styles.selectedGradient}
            >
              <Text style={[styles.dayText, styles.selectedText]}>{day}</Text>
              {hasEntry && <View style={[styles.entryDot, styles.selectedDot]} />}
            </LinearGradient>
          ) : (
            <>
              <Text style={[
                styles.dayText,
                isToday && styles.todayText,
              ]}>
                {day}
              </Text>
              {hasEntry && <View style={styles.entryDot} />}
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyCell = (key: string) => (
    <View key={key} style={[styles.dayCell, { width: cellSize, height: cellSize }]} />
  );
  
  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        {days.map(day => (
          <View key={day} style={[styles.headerCell, { width: cellSize }]}>
            <Text style={styles.headerText}>{day}</Text>
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.grid}>
        {/* Empty cells for days before the first day of the month */}
        {Array.from({ length: firstDayOfWeek }, (_, i) => renderEmptyCell(`empty-${i}`))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => renderDay(i + 1))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.xxl,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  headerCell: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    padding: 2,
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    position: 'relative',
  },
  todayContent: {
    backgroundColor: colors.borderLight,
  },
  selectedContent: {
    overflow: 'hidden',
  },
  selectedGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  todayText: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  selectedText: {
    color: colors.white,
    fontFamily: fonts.semiBold,
  },
  entryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.warning,
    position: 'absolute',
    bottom: 4,
  },
  selectedDot: {
    backgroundColor: colors.white,
  },
});