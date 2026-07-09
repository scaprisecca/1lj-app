import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Edit3 } from 'lucide-react-native';
import type { JournalEntry } from '@/lib/database/schema';
import { formatDateString, parseDateString } from '@/lib/utils/date';
import { htmlToPlainText } from '@/utils/html';

interface HistoryCardProps {
  entry: JournalEntry;
  onPress?: () => void;
  showDate?: boolean;
}

export function HistoryCard({ entry, onPress, showDate = true }: HistoryCardProps) {
  const formatDate = (dateString: string) => {
    return formatDateString(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatRelativeDate = (dateString: string) => {
    const date = parseDateString(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color="#6366F1" />
          {showDate && (
            <Text style={styles.dateText}>{formatDate(entry.entry_date)}</Text>
          )}
          <Text style={styles.relativeText}>({formatRelativeDate(entry.entry_date)})</Text>
        </View>
        {onPress && <Edit3 size={16} color="#94A3B8" />}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.previewText} numberOfLines={3}>
          {htmlToPlainText(entry.html_body)}
        </Text>
      </View>
      
      {entry.updated_at !== entry.created_at && (
        <Text style={styles.updatedText}>
          Last updated: {new Date(entry.updated_at).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#1E293B',
    marginLeft: 8,
  },
  relativeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 4,
  },
  contentContainer: {
    marginBottom: 8,
  },
  previewText: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: '#334155',
  },
  updatedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
});