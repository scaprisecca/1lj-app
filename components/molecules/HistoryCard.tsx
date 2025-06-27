import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Edit3 } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import type { JournalEntry } from '@/lib/database/schema';

interface HistoryCardProps {
  entry: JournalEntry;
  onPress?: () => void;
  showDate?: boolean;
}

export function HistoryCard({ entry, onPress, showDate = true }: HistoryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
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

  // Create simplified HTML content for WebView rendering (Expo Go compatible)
  const createHtmlContent = (htmlBody: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #334155;
            margin: 0;
            padding: 0;
            background: transparent;
          }
          p { margin: 0 0 8px 0; }
          p:last-child { margin-bottom: 0; }
          h1, h2, h3 { margin: 0 0 8px 0; color: #1E293B; }
          ul, ol { margin: 0 0 8px 16px; padding: 0; }
          strong { color: #1E293B; }
        </style>
      </head>
      <body>${htmlBody}</body>
      </html>
    `;
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
        <WebView
          source={{ html: createHtmlContent(entry.html_body) }}
          style={styles.webView}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          originWhitelist={['*']}
          javaScriptEnabled={false}
        />
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
    minHeight: 50,
    marginBottom: 8,
  },
  webView: {
    height: 80,
    backgroundColor: 'transparent',
  },
  updatedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
    fontStyle: 'italic',
  },
});