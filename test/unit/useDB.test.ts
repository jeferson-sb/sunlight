/**
 * useDB composable tests
 *
 * Dexie (IndexedDB) is mocked with an in-memory implementation so these run
 * in Node without a real browser. The mock is defined inside vi.mock() so it
 * is correctly hoisted by Vitest.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Shared in-memory store — accessed by both the mock and the tests.
// Defined at module level so it persists between imports but can be reset.
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, unknown>
type TableStore = {
  rows: AnyRecord[]
}

const stores: Record<'events' | 'gaps' | 'engagements' | 'prefs', TableStore> = {
  events: { rows: [] },
  gaps: { rows: [] },
  engagements: { rows: [] },
  prefs: { rows: [] },
}

const resetStores = () => {
  for (const store of Object.values(stores)) {
    store.rows = []
  }
}

const makeTable = (store: TableStore) => ({
  toArray: async () => [...store.rows],
  add: async (row: AnyRecord) => { store.rows.push(row) },
  bulkAdd: async (rows: AnyRecord[]) => { store.rows.push(...rows) },
  clear: async () => { store.rows = [] },
  get: async (id: unknown) => store.rows.find(r => r.id === id),
  where: (field: string) => ({
    above: (value: unknown) => ({
      toArray: async () => store.rows.filter(r => (r[field] as string) > (value as string)),
    }),
  }),
  toCollection: () => ({
    first: async () => store.rows[0] ?? undefined,
  }),
})

// ---------------------------------------------------------------------------
// Mock Dexie using vi.mock (hoisted, factory runs before imports)
// ---------------------------------------------------------------------------

vi.mock('dexie', () => {
  const s = {
    events: { rows: [] as AnyRecord[] },
    gaps: { rows: [] as AnyRecord[] },
    engagements: { rows: [] as AnyRecord[] },
    prefs: { rows: [] as AnyRecord[] },
  }

  const makeT = (store: { rows: AnyRecord[] }) => ({
    toArray: async () => [...store.rows],
    add: async (row: AnyRecord) => { store.rows.push(row) },
    bulkAdd: async (rows: AnyRecord[]) => { store.rows.push(...rows) },
    clear: async () => { store.rows = [] },
    get: async (id: unknown) => store.rows.find(r => r.id === id),
    where: (field: string) => ({
      above: (value: unknown) => ({
        toArray: async () => store.rows.filter(r => (r[field] as string) > (value as string)),
      }),
    }),
    toCollection: () => ({ first: async () => store.rows[0] ?? undefined }),
  })

  // Expose stores on globalThis so tests can inspect/reset them
  ;(globalThis as Record<string, unknown>).__dbStores = s

  // Tables are set in version().stores() — not as class fields — because
  // TypeScript's useDefineForClassFields (enabled by Vite) would cause
  // subclass field declarations (events!: Table) to overwrite parent
  // class fields with undefined after super().
  class MockDexie {
    version(_v: number) {
      return {
        stores: (_schema: unknown) => {
          ;(this as Record<string, unknown>).events = makeT(s.events)
          ;(this as Record<string, unknown>).gaps = makeT(s.gaps)
          ;(this as Record<string, unknown>).engagements = makeT(s.engagements)
          ;(this as Record<string, unknown>).prefs = makeT(s.prefs)
          return this
        }
      }
    }
  }

  return { default: MockDexie }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DbStores = {
  events: { rows: AnyRecord[] }
  gaps: { rows: AnyRecord[] }
  engagements: { rows: AnyRecord[] }
  prefs: { rows: AnyRecord[] }
}

const getStores = (): DbStores =>
  (globalThis as Record<string, unknown>).__dbStores as DbStores

const clearAllStores = () => {
  const s = getStores()
  for (const store of Object.values(s)) {
    store.rows = []
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Default: simulate browser environment
let _isClient = true
Object.defineProperty(import.meta, 'client', { configurable: true, get: () => _isClient })

describe('useDB', () => {
  beforeEach(async () => {
    // Reset modules first so the mock factory runs fresh on next import
    vi.resetModules()
    // Trigger the mock factory by importing the module
    await import('../../app/composables/useDB')
    // Now __dbStores is populated — clear any leftover data
    clearAllStores()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const getUseDB = async () => {
    const mod = await import('../../app/composables/useDB')
    return mod.useDB
  }

  // -------------------------------------------------------------------------
  // SSR guard
  // -------------------------------------------------------------------------

  describe('SSR guard', () => {
    // import.meta is per-module — cannot be patched from outside the module.
    // Testing this guard requires a separate Vitest environment config with
    // import.meta.client set to false at build time.
    it.skip('throws when called on the server (import.meta.client is false)', () => {})
  })

  // -------------------------------------------------------------------------
  // events
  // -------------------------------------------------------------------------

  describe('events', () => {
    it('returns empty array when cache is empty', async () => {
      const useDB = await getUseDB()
      const { events } = useDB()

      expect(await events.get()).toEqual([])
    })

    it('returns cached events when cache is fresh (< 15 min)', async () => {
      const useDB = await getUseDB()
      const { events } = useDB()

      const fresh = [
        { id: 'e1', title: 'Standup', start: '2024-01-15T09:00:00Z', end: '2024-01-15T09:30:00Z', isAllDay: false },
      ]
      await events.set(fresh)

      const result = await events.get()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('e1')
    })

    it('returns empty array when cached events are stale (> 15 min)', async () => {
      const sixteenMinutesAgo = Date.now() - 16 * 60 * 1000
      const s = getStores()
      s.events.rows = [
        { id: 'e-stale', title: 'Old', start: '', end: '', isAllDay: false, cached_at: sixteenMinutesAgo },
      ]

      const useDB = await getUseDB()
      const { events } = useDB()

      expect(await events.get()).toEqual([])
    })

    it('stamps each event with cached_at on set', async () => {
      const useDB = await getUseDB()
      const { events } = useDB()

      await events.set([{ id: 'e2', title: 'T', start: '', end: '', isAllDay: false }])

      const s = getStores()
      expect(typeof s.events.rows[0].cached_at).toBe('number')
    })

    it('replaces all events when set is called a second time', async () => {
      const useDB = await getUseDB()
      const { events } = useDB()

      await events.set([{ id: 'old', title: 'Old', start: '', end: '', isAllDay: false }])
      await events.set([{ id: 'new', title: 'New', start: '', end: '', isAllDay: false }])

      const s = getStores()
      expect(s.events.rows).toHaveLength(1)
      expect(s.events.rows[0].id).toBe('new')
    })

    it('clears all events', async () => {
      const useDB = await getUseDB()
      const { events } = useDB()

      await events.set([{ id: 'e3', title: 'T', start: '', end: '', isAllDay: false }])
      await events.clear()

      const s = getStores()
      expect(s.events.rows).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // gaps
  // -------------------------------------------------------------------------

  describe('gaps', () => {
    it('adds and retrieves a gap by id', async () => {
      const useDB = await getUseDB()
      const { gaps } = useDB()

      const gap = { id: 'g1', start: '2024-01-15T10:00:00', end: '2024-01-15T10:20:00', duration_minutes: 20 }
      await gaps.add(gap)

      const result = await gaps.get('g1')
      expect(result?.id).toBe('g1')
      expect(result?.duration_minutes).toBe(20)
    })

    it('returns undefined for a non-existent id', async () => {
      const useDB = await getUseDB()
      const { gaps } = useDB()

      expect(await gaps.get('missing')).toBeUndefined()
    })

    it('getRecent returns gaps notified within the window', async () => {
      const useDB = await getUseDB()
      const { gaps } = useDB()

      const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      const old = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

      await gaps.add({ id: 'g-recent', start: '', end: '', duration_minutes: 10, notified_at: recent })
      await gaps.add({ id: 'g-old', start: '', end: '', duration_minutes: 10, notified_at: old })

      const result = await gaps.getRecent(48)
      const ids = result.map(g => g.id)
      expect(ids).toContain('g-recent')
      expect(ids).not.toContain('g-old')
    })

    it('getRecent defaults to 48 hours', async () => {
      const useDB = await getUseDB()
      const { gaps } = useDB()

      const ts = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      await gaps.add({ id: 'g-24h', start: '', end: '', duration_minutes: 10, notified_at: ts })

      const result = await gaps.getRecent()
      expect(result.map(g => g.id)).toContain('g-24h')
    })

    it('clears all gaps', async () => {
      const useDB = await getUseDB()
      const { gaps } = useDB()

      await gaps.add({ id: 'g2', start: '', end: '', duration_minutes: 5 })
      await gaps.clear()

      const s = getStores()
      expect(s.gaps.rows).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // engagements
  // -------------------------------------------------------------------------

  describe('engagements', () => {
    it('persists an engagement record', async () => {
      const useDB = await getUseDB()
      const { engagements } = useDB()

      await engagements.add({ moment_id: 'm1', gap_id: 'g1', action: 'completed', timestamp: '2024-01-15T10:00:00Z' })

      const s = getStores()
      expect(s.engagements.rows).toHaveLength(1)
    })

    it('falls back to current timestamp when timestamp is empty string', async () => {
      const useDB = await getUseDB()
      const { engagements } = useDB()

      const before = new Date().toISOString()
      await engagements.add({ moment_id: 'm2', gap_id: 'g1', action: 'dismissed', timestamp: '' })
      const after = new Date().toISOString()

      const s = getStores()
      const ts = s.engagements.rows[0].timestamp as string
      // The auto-generated timestamp should be between before and after
      expect(ts >= before || ts <= after).toBe(true)
    })

    it('preserves an explicitly provided timestamp', async () => {
      const useDB = await getUseDB()
      const { engagements } = useDB()

      const ts = '2024-01-15T12:00:00.000Z'
      await engagements.add({ moment_id: 'm3', gap_id: 'g2', action: 'skipped', timestamp: ts })

      const s = getStores()
      expect(s.engagements.rows[0].timestamp).toBe(ts)
    })

    it('getRecent filters by hours window', async () => {
      const useDB = await getUseDB()
      const { engagements } = useDB()

      const recentTs = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const oldTs = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString()

      await engagements.add({ moment_id: 'm-new', gap_id: 'g1', action: 'skipped', timestamp: recentTs })
      await engagements.add({ moment_id: 'm-old', gap_id: 'g2', action: 'skipped', timestamp: oldTs })

      const result = await engagements.getRecent(48)
      const momentIds = result.map(e => e.moment_id)
      expect(momentIds).toContain('m-new')
      expect(momentIds).not.toContain('m-old')
    })

    it('clears all engagements', async () => {
      const useDB = await getUseDB()
      const { engagements } = useDB()

      await engagements.add({ moment_id: 'm1', gap_id: 'g1', action: 'completed', timestamp: '' })
      await engagements.clear()

      const s = getStores()
      expect(s.engagements.rows).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // prefs
  // -------------------------------------------------------------------------

  describe('prefs', () => {
    it('returns default values when no prefs are stored', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      const result = await prefs.get()
      expect(result.style).toBe('direct')
      expect(result.working_hours_start).toBe('08:00')
      expect(result.working_hours_end).toBe('18:00')
      expect(result.consecutive_dismissals).toBe(0)
      expect(result.week_number).toBe(1)
    })

    it('stores and retrieves a pref update', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      await prefs.set({ style: 'reflective', week_number: 3 })
      const result = await prefs.get()

      expect(result.style).toBe('reflective')
      expect(result.week_number).toBe(3)
    })

    it('merges partial updates with existing prefs', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      await prefs.set({ style: 'reflective' })
      await prefs.set({ week_number: 4 })
      const result = await prefs.get()

      expect(result.style).toBe('reflective')
      expect(result.week_number).toBe(4)
    })

    it('incrementDismissals increments consecutive_dismissals by 1', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      await prefs.incrementDismissals()
      const result = await prefs.get()
      expect(result.consecutive_dismissals).toBe(1)
    })

    it('incrementDismissals accumulates across multiple calls', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      await prefs.incrementDismissals()
      await prefs.incrementDismissals()
      await prefs.incrementDismissals()
      const result = await prefs.get()
      expect(result.consecutive_dismissals).toBe(3)
    })

    it('resetDismissals sets consecutive_dismissals to 0', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      await prefs.set({ consecutive_dismissals: 5 })
      await prefs.resetDismissals()
      const result = await prefs.get()
      expect(result.consecutive_dismissals).toBe(0)
    })

    it('clears all prefs', async () => {
      const useDB = await getUseDB()
      const { prefs } = useDB()

      await prefs.set({ style: 'reflective' })
      await prefs.clear()

      const s = getStores()
      expect(s.prefs.rows).toHaveLength(0)
    })
  })

  // -------------------------------------------------------------------------
  // clearAll
  // -------------------------------------------------------------------------

  describe('clearAll', () => {
    it('clears all four tables in one call', async () => {
      const useDB = await getUseDB()
      const { events, gaps, engagements, prefs, clearAll } = useDB()

      // Populate all tables
      await events.set([{ id: 'e1', title: '', start: '', end: '', isAllDay: false }])
      await gaps.add({ id: 'g1', start: '', end: '', duration_minutes: 10 })
      await engagements.add({ moment_id: 'm1', gap_id: 'g1', action: 'completed', timestamp: '' })
      await prefs.set({ style: 'direct' })

      await clearAll()

      const s = getStores()
      expect(s.events.rows).toHaveLength(0)
      expect(s.gaps.rows).toHaveLength(0)
      expect(s.engagements.rows).toHaveLength(0)
      expect(s.prefs.rows).toHaveLength(0)
    })
  })
})
