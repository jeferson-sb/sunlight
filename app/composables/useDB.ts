import Dexie, { type Table } from 'dexie'
import type { Engagement } from '~/types/engagement'

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  isAllDay: boolean
  cached_at?: number
}

export type Gap = {
  id: string
  start: string
  end: string
  duration_minutes: number
  moment_id_served?: string
  notified_at?: string
}

export type Prefs = {
  id?: number
  style?: 'direct' | 'reflective'
  voice?: 'a' | 'b'
  week_number?: number
  last_notified_at?: string
  consecutive_dismissals?: number
  working_hours_start?: string
  working_hours_end?: string
  last_insight?: string
  permission_declined_at?: string
}

class SunlightDB extends Dexie {
  private static instance: SunlightDB

  events!: Table<CalendarEvent>
  gaps!: Table<Gap>
  engagements!: Table<Engagement>
  prefs!: Table<Prefs>

  private constructor() {
    super('sunlight')

    this.version(2).stores({
      events: 'id, cached_at',
      gaps: 'id, notified_at',
      engagements: '++id, moment_id, gap_id, action, timestamp',
      prefs: '++id'
    })
  }

  static getInstance(): SunlightDB {
    if (!SunlightDB.instance) {
      SunlightDB.instance = new SunlightDB()
    }
    return SunlightDB.instance
  }
}

export const useDB = () => {
  // Guard against SSR
  if (!import.meta.client) {
    throw new Error('useDB must only be called on the client side')
  }

  const db = SunlightDB.getInstance()

  // Calendar events with caching
  const events = {
    async get(): Promise<CalendarEvent[]> {
      // Check cache (15 minutes)
      const cached = await db.events.toArray()
      if (cached.length > 0) {
        const cacheAge = Date.now() - (cached[0].cached_at || 0)
        if (cacheAge < 15 * 60 * 1000) {
          return cached
        }
      }
      return []
    },

    async set(newEvents: CalendarEvent[]): Promise<void> {
      await db.events.clear()
      const eventsWithCache = newEvents.map(event => ({
        ...event,
        cached_at: Date.now()
      }))
      await db.events.bulkAdd(eventsWithCache)
    },

    async clear(): Promise<void> {
      await db.events.clear()
    }
  }

  // Gap operations
  const gaps = {
    async add(gap: Gap): Promise<void> {
      await db.gaps.add(gap)
    },

    async get(id: string): Promise<Gap | undefined> {
      return db.gaps.get(id)
    },

    async getRecent(hours: number = 48): Promise<Gap[]> {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      return db.gaps.where('notified_at').above(since).toArray()
    },

    async clear(): Promise<void> {
      await db.gaps.clear()
    }
  }

  // Engagement tracking
  const engagements = {
    async add(engagement: Omit<Engagement, 'id'>): Promise<void> {
      await db.engagements.add({
        ...engagement,
        timestamp: engagement.timestamp || new Date().toISOString()
      })
    },

    async getRecent(hours: number = 48): Promise<Engagement[]> {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      return db.engagements.where('timestamp').above(since).toArray()
    },

    async clear(): Promise<void> {
      await db.engagements.clear()
    }
  }

  // User preferences
  const prefs = {
    async get(): Promise<Prefs> {
      const pref = await db.prefs.toCollection().first()
      return pref || {
        style: 'direct',
        working_hours_start: '08:00',
        working_hours_end: '18:00',
        consecutive_dismissals: 0,
        week_number: 1
      }
    },

    async set(updates: Partial<Prefs>): Promise<void> {
      const current = await this.get()
      const updated = { ...current, ...updates }

      await db.prefs.clear()
      await db.prefs.add(updated)
    },

    async incrementDismissals(): Promise<void> {
      const current = await this.get()
      await this.set({
        consecutive_dismissals: (current.consecutive_dismissals || 0) + 1
      })
    },

    async resetDismissals(): Promise<void> {
      await this.set({ consecutive_dismissals: 0 })
    },

    async clear(): Promise<void> {
      await db.prefs.clear()
    }
  }

  // Clear all data (for testing or logout)
  const clearAll = async (): Promise<void> => {
    await Promise.all([
      events.clear(),
      gaps.clear(),
      engagements.clear(),
      prefs.clear()
    ])
  }

  return {
    db,
    events,
    gaps,
    engagements,
    prefs,
    clearAll
  }
}
