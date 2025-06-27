import { getDatabase, isUsingMock } from '@/lib/database/client';
import { journalEntries, type JournalEntry, type NewJournalEntry } from '@/lib/database/schema';
import { eq, desc, sql } from 'drizzle-orm';

// Mock data for when SQLite is not available
const mockEntries: JournalEntry[] = [
  {
    id: 1,
    date: new Date().toISOString().split('T')[0],
    content: 'Welcome to your journal! This is a sample entry showing how the app works.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    content: 'Yesterday was a good day. I learned something new about React Native development.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

let mockIdCounter = 3;

export class DatabaseService {
  static async createEntry(date: string, content: string): Promise<JournalEntry> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        const newEntry: JournalEntry = {
          id: mockIdCounter++,
          date,
          content,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        // Replace or add entry for this date
        const existingIndex = mockEntries.findIndex(e => e.date === date);
        if (existingIndex >= 0) {
          mockEntries[existingIndex] = { ...mockEntries[existingIndex], content, updatedAt: new Date().toISOString() };
          return mockEntries[existingIndex];
        } else {
          mockEntries.unshift(newEntry);
          return newEntry;
        }
      }

      const db = getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }
      
      const result = await db.insert(journalEntries).values({
        date,
        content,
        updatedAt: new Date().toISOString(),
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating entry:', error);
      throw new Error('Failed to create journal entry');
    }
  }

  static async updateEntry(id: number, content: string): Promise<JournalEntry> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        const entryIndex = mockEntries.findIndex(e => e.id === id);
        if (entryIndex >= 0) {
          mockEntries[entryIndex] = {
            ...mockEntries[entryIndex],
            content,
            updatedAt: new Date().toISOString(),
          };
          return mockEntries[entryIndex];
        }
        throw new Error('Entry not found');
      }

      const db = getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }
      
      const result = await db
        .update(journalEntries)
        .set({ content, updatedAt: new Date().toISOString() })
        .where(eq(journalEntries.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error('Entry not found');
      }
      
      return result[0];
    } catch (error) {
      console.error('Error updating entry:', error);
      throw new Error('Failed to update journal entry');
    }
  }

  static async getEntryByDate(date: string): Promise<JournalEntry | null> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        return mockEntries.find(e => e.date === date) || null;
      }

      const db = getDatabase();
      if (!db) {
        return null;
      }
      
      const result = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.date, date))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error getting entry by date:', error);
      return null;
    }
  }

  static async getAllEntries(): Promise<JournalEntry[]> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        return [...mockEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }

      const db = getDatabase();
      if (!db) {
        return [];
      }
      
      return await db
        .select()
        .from(journalEntries)
        .orderBy(desc(journalEntries.date));
    } catch (error) {
      console.error('Error getting all entries:', error);
      return [];
    }
  }

  static async getEntriesForMonth(year: number, month: number): Promise<JournalEntry[]> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
        
        return mockEntries.filter(e => e.date >= startDate && e.date <= endDate);
      }

      const db = getDatabase();
      if (!db) {
        return [];
      }
      
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      return await db
        .select()
        .from(journalEntries)
        .where(
          sql`${journalEntries.date} >= ${startDate} AND ${journalEntries.date} <= ${endDate}`
        )
        .orderBy(desc(journalEntries.date));
    } catch (error) {
      console.error('Error getting entries for month:', error);
      return [];
    }
  }

  static async getHistoryForDate(monthDay: string): Promise<JournalEntry[]> {
    try {
      if (isUsingMock()) {
        // Mock implementation - return entries that match MM-DD format
        return mockEntries.filter(e => e.date.substring(5) === monthDay);
      }

      const db = getDatabase();
      if (!db) {
        return [];
      }
      
      return await db
        .select()
        .from(journalEntries)
        .where(sql`substr(${journalEntries.date}, 6) = ${monthDay}`)
        .orderBy(desc(journalEntries.date));
    } catch (error) {
      console.error('Error getting history for date:', error);
      return [];
    }
  }

  static async deleteEntry(id: number): Promise<void> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        const entryIndex = mockEntries.findIndex(e => e.id === id);
        if (entryIndex >= 0) {
          mockEntries.splice(entryIndex, 1);
        }
        return;
      }

      const db = getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }
      
      await db.delete(journalEntries).where(eq(journalEntries.id, id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw new Error('Failed to delete journal entry');
    }
  }

  static async getEntryCount(): Promise<number> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        return mockEntries.length;
      }

      const db = getDatabase();
      const result = await db.select({ count: sql<number>`count(*)` })
        .from(journalEntries);
      
      return result[0].count;
    } catch (error) {
      console.error('Error getting entry count:', error);
      return 0;
    }
  }
}