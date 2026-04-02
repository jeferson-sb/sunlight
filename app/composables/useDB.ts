import Dexie, { type Table } from 'dexie'

// Define types for our tables
export interface Token {
  id?: number
  access_token: string
  refresh_token: string
  expires_at: number
  encrypted?: boolean
}

export interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  isAllDay: boolean
  cached_at?: number
}

export interface Gap {
  id: string
  start: string
  end: string
  duration_minutes: number
  moment_id_served?: string
  notified_at?: string
}

export interface Moment {
  id: string
  type: 'breath' | 'physical' | 'grounding' | 'reflection' | 'sensory'
  copy: {
    direct: string
    reflective: string
  }
  why_it_works: string
  min_duration: number
  max_duration: number
  available_from_week: number
  tags: string[]
}

export interface Engagement {
  id?: number
  moment_id: string
  gap_id: string
  action: 'completed' | 'dismissed' | 'skipped'
  timestamp: string
}

export interface Prefs {
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

// Extend Dexie with our schema
class SunlightDB extends Dexie {
  tokens!: Table<Token>
  events!: Table<CalendarEvent>
  gaps!: Table<Gap>
  moments!: Table<Moment>
  engagements!: Table<Engagement>
  prefs!: Table<Prefs>

  constructor() {
    super('sunlight')

    this.version(1).stores({
      tokens: '++id',
      events: 'id, cached_at',
      gaps: 'id, notified_at',
      moments: 'id, type, available_from_week',
      engagements: '++id, moment_id, gap_id, action, timestamp',
      prefs: '++id'
    })
  }
}

// Encryption utilities using Web Crypto API
class TokenEncryption {
  private algorithm = 'AES-GCM'
  private keyLength = 256

  // Generate or retrieve encryption key
  private async getKey(): Promise<CryptoKey> {
    // Check if we have a stored key seed
    let keySeed = localStorage.getItem('sunlight_key_seed')

    if (!keySeed) {
      // Generate new random seed
      const array = new Uint8Array(32)
      crypto.getRandomValues(array)
      keySeed = btoa(String.fromCharCode(...array))
      localStorage.setItem('sunlight_key_seed', keySeed)
    }

    // Derive key from seed
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(keySeed),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('sunlight_salt_v1'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    )
  }

  async encrypt(data: string): Promise<{ encrypted: string; iv: string }> {
    const key = await this.getKey()
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encrypted = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      key,
      encoder.encode(data)
    )

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    }
  }

  async decrypt(encryptedData: string, ivStr: string): Promise<string> {
    const key = await this.getKey()
    const decoder = new TextDecoder()

    const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
    const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0))

    const decrypted = await crypto.subtle.decrypt(
      { name: this.algorithm, iv },
      key,
      encrypted
    )

    return decoder.decode(decrypted)
  }
}

// Main composable
export const useDB = () => {
  const db = new SunlightDB()
  const encryption = new TokenEncryption()

  // Token operations with encryption
  const tokens = {
    async get(): Promise<Token | null> {
      const token = await db.tokens.toCollection().first()
      if (!token) return null

      // Decrypt if encrypted
      if (token.encrypted && token.access_token && token.refresh_token) {
        try {
          const [accessData, refreshData] = await Promise.all([
            JSON.parse(token.access_token),
            JSON.parse(token.refresh_token)
          ])

          token.access_token = await encryption.decrypt(accessData.encrypted, accessData.iv)
          token.refresh_token = await encryption.decrypt(refreshData.encrypted, refreshData.iv)
        } catch (error) {
          console.error('Failed to decrypt tokens:', error)
          return null
        }
      }

      return token
    },

    async set(token: Token): Promise<void> {
      // Encrypt tokens before storage
      const encryptedAccess = await encryption.encrypt(token.access_token)
      const encryptedRefresh = await encryption.encrypt(token.refresh_token)

      const encryptedToken: Token = {
        ...token,
        access_token: JSON.stringify(encryptedAccess),
        refresh_token: JSON.stringify(encryptedRefresh),
        encrypted: true
      }

      // Clear existing tokens and add new
      await db.tokens.clear()
      await db.tokens.add(encryptedToken)
    },

    async clear(): Promise<void> {
      await db.tokens.clear()
    }
  }

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

    async set(events: CalendarEvent[]): Promise<void> {
      await db.events.clear()
      const eventsWithCache = events.map(event => ({
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

  // Moment operations
  const moments = {
    async getAll(): Promise<Moment[]> {
      return db.moments.toArray()
    },

    async get(id: string): Promise<Moment | undefined> {
      return db.moments.get(id)
    },

    async bulkAdd(moments: Moment[]): Promise<void> {
      await db.moments.bulkAdd(moments)
    },

    async getByWeek(weekNumber: number): Promise<Moment[]> {
      return db.moments.where('available_from_week').belowOrEqual(weekNumber).toArray()
    },

    async clear(): Promise<void> {
      await db.moments.clear()
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

    async getByMomentType(type: string, days: number = 7): Promise<Engagement[]> {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      const allEngagements = await db.engagements.where('timestamp').above(since).toArray()

      // Filter by moment type (would need to join with moments table)
      const moments = await db.moments.where('type').equals(type).toArray()
      const momentIds = new Set(moments.map(m => m.id))

      return allEngagements.filter(e => momentIds.has(e.moment_id))
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
  const clearAll = async () => {
    await Promise.all([
      tokens.clear(),
      events.clear(),
      gaps.clear(),
      moments.clear(),
      engagements.clear(),
      prefs.clear()
    ])
  }

  return {
    db,
    tokens,
    events,
    gaps,
    moments,
    engagements,
    prefs,
    clearAll
  }
}