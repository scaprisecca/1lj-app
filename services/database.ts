import { getDatabase, isUsingMock } from '@/lib/database/client';
import { journalEntries, type JournalEntry, type NewJournalEntry } from '@/lib/database/schema';
import { eq, desc, sql } from 'drizzle-orm';

// Mock data for when SQLite is not available
const mockEntries: JournalEntry[] = [
  {
    id: 1,
    entry_date: new Date().toISOString().split('T')[0],
    html_body: '<p>Welcome to your journal! This is a sample entry showing how the app works.</p>',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    entry_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday
    html_body: '<p>Yesterday was a good day. I learned something new about <strong>React Native</strong> development.</p>',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

let mockIdCounter = 3;

export class DatabaseService {
  static async createEntry(date: string, htmlContent: string): Promise<JournalEntry> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        const newEntry: JournalEntry = {
          id: mockIdCounter++,
          entry_date: date,
          html_body: htmlContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Replace or add entry for this date
        const existingIndex = mockEntries.findIndex(e => e.entry_date === date);
        if (existingIndex >= 0) {
          mockEntries[existingIndex] = { ...mockEntries[existingIndex], html_body: htmlContent, updated_at: new Date().toISOString() };
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
        entry_date: date,
        html_body: htmlContent,
        updated_at: new Date().toISOString(),
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating entry:', error);
      throw new Error('Failed to create journal entry');
    }
  }

  static async updateEntry(id: number, htmlContent: string): Promise<JournalEntry> {
    try {
      if (isUsingMock()) {
        // Mock implementation
        const entryIndex = mockEntries.findIndex(e => e.id === id);
        if (entryIndex >= 0) {
          mockEntries[entryIndex] = {
            ...mockEntries[entryIndex],
            html_body: htmlContent,
            updated_at: new Date().toISOString(),
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
        .set({ html_body: htmlContent, updated_at: new Date().toISOString() })
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
        return mockEntries.find(e => e.entry_date === date) || null;
      }

      const db = getDatabase();
      if (!db) {
        return null;
      }
      
      const result = await db
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.entry_date, date))
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
        return [...mockEntries].sort((a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime());
      }

      const db = getDatabase();
      if (!db) {
        return [];
      }
      
      return await db
        .select()
        .from(journalEntries)
        .orderBy(desc(journalEntries.entry_date));
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
        
        return mockEntries.filter(e => e.entry_date >= startDate && e.entry_date <= endDate);
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
          sql`${journalEntries.entry_date} >= ${startDate} AND ${journalEntries.entry_date} <= ${endDate}`
        )
        .orderBy(desc(journalEntries.entry_date));
    } catch (error) {
      console.error('Error getting entries for month:', error);
      return [];
    }
  }

  static async getHistoryForDate(monthDay: string): Promise<JournalEntry[]> {
    try {
      if (isUsingMock()) {
        // Mock implementation - return entries that match MM-DD format
        return mockEntries.filter(e => e.entry_date.substring(5) === monthDay);
      }

      const db = getDatabase();
      if (!db) {
        return [];
      }
      
      return await db
        .select()
        .from(journalEntries)
        .where(sql`substr(${journalEntries.entry_date}, 6) = ${monthDay}`)
        .orderBy(desc(journalEntries.entry_date));
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