/// <reference lib="webworker" />
/// <reference path="./types/sw.d.ts" />

import { precacheAndRoute } from 'workbox-precaching'
import Dexie from 'dexie'
import { detectGaps } from './utils/detectGaps'
import { selectMoment, getMomentCopy } from './utils/selectMoment'
import type { CalendarEvent, Prefs } from './composables/useDB'
import type { Moment } from './types/moment'
import type { Engagement } from './types/engagement'

declare const self: ServiceWorkerGlobalScope

// Vite will replace this with the precache manifest at build time
precacheAndRoute(self.__WB_MANIFEST)

// ---------------------------------------------------------------------------
// Database — mirrors SunlightDB schema from composables/useDB.ts
// We instantiate Dexie directly because useDB() has an import.meta.client guard
// ---------------------------------------------------------------------------

const db = new Dexie('sunlight')

db.version(2).stores({
  events: 'id, cached_at',
  gaps: 'id, notified_at',
  engagements: '++id, moment_id, gap_id, action, timestamp',
  prefs: '++id'
})

const dbPrefs = db.table<Prefs>('prefs')
const dbEngagements = db.table<Engagement>('engagements')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type GoogleEventDateTime = {
  dateTime?: string | null
  date?: string | null
}

type GoogleCalendarEvent = {
  id?: string | null
  summary?: string | null
  start?: GoogleEventDateTime | null
  end?: GoogleEventDateTime | null
}

/** Normalize a raw Google Calendar Schema$Event to the CalendarEvent shape used by detectGaps. */
const normalizeEvent = (raw: GoogleCalendarEvent): CalendarEvent | null => {
  const id = raw.id
  const start = raw.start?.dateTime ?? raw.start?.date
  const end = raw.end?.dateTime ?? raw.end?.date

  if (!id || !start || !end) return null

  return {
    id,
    title: raw.summary ?? '',
    start,
    end,
    isAllDay: !raw.start?.dateTime
  }
}

const readPrefs = async (): Promise<Prefs> => {
  const stored = await dbPrefs.toCollection().first()
  return stored ?? {
    style: 'direct',
    working_hours_start: '08:00',
    working_hours_end: '18:00',
    consecutive_dismissals: 0,
    week_number: 1
  }
}

const writePrefs = async (updates: Partial<Prefs>): Promise<void> => {
  const current = await readPrefs()
  const updated = { ...current, ...updates }
  await dbPrefs.clear()
  await dbPrefs.add(updated)
}

const getRecentEngagements = async (hours: number = 48): Promise<Engagement[]> => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  return dbEngagements.where('timestamp').above(since).toArray()
}

// ---------------------------------------------------------------------------
// push event
// ---------------------------------------------------------------------------

self.addEventListener('push', (event: PushEvent) => {
  event.waitUntil(handlePush())
})

const handlePush = async (): Promise<void> => {
  // 1. Fetch calendar events — session cookie included automatically (same-origin)
  let eventsRes: Response
  let momentsRes: Response

  try {
    ;[eventsRes, momentsRes] = await Promise.all([
      fetch('/api/calendar/events', { credentials: 'include' }),
      fetch('/api/moments')
    ])
  } catch {
    // Network unreachable — exit silently
    return
  }

  if (!eventsRes.ok || !momentsRes.ok) return

  let rawEvents: { items: GoogleCalendarEvent[] }
  let moments: Moment[]

  try {
    ;[rawEvents, moments] = await Promise.all([
      eventsRes.json() as Promise<{ items: GoogleCalendarEvent[] }>,
      momentsRes.json() as Promise<Moment[]>
    ])
  } catch {
    return
  }

  // 2. Normalize Google Calendar events to the CalendarEvent shape
  const events: CalendarEvent[] = rawEvents.items
    .map(normalizeEvent)
    .filter((e): e is CalendarEvent => e !== null)

  // 3. Read prefs from IndexedDB
  const prefs = await readPrefs()

  // 4. Detect a qualifying gap
  const gap = detectGaps(events, new Date(), prefs)
  if (!gap) return

  // 5. Select the best moment
  const recentEngagements = await getRecentEngagements()
  const moment = selectMoment(gap, moments, prefs, recentEngagements)
  if (!moment) return

  // 6. Get notification copy based on style preference
  const style = prefs.style ?? 'direct'
  const momentCopy = getMomentCopy(moment, style)

  // 7. Show notification
  await self.registration.showNotification('Sunlight', {
    body: momentCopy,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'sunlight-moment',
    data: { momentId: moment.id, gapId: gap.id },
    actions: [
      { action: 'open', title: 'Take a moment' },
      { action: 'dismiss', title: 'Not now' }
    ]
  })

  // 8. Record the notification time
  await writePrefs({ last_notified_at: new Date().toISOString() })
}

// ---------------------------------------------------------------------------
// notificationclick event
// ---------------------------------------------------------------------------

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const { momentId, gapId } = (event.notification.data ?? {}) as { momentId?: string; gapId?: string }
  const action = event.action

  // 'open' action or body click — navigate to the moment page
  if (action === 'open' || action === '') {
    if (!momentId) return

    const url = `/moment/${momentId}${gapId ? `?gap=${gapId}` : ''}`

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
        // Focus an existing window if one already has this URL
        const existing = windowClients.find(c => c.url.includes(url))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
    )
  }
})

// ---------------------------------------------------------------------------
// notificationclose event
// ---------------------------------------------------------------------------

self.addEventListener('notificationclose', (event: NotificationEvent) => {
  const { momentId, gapId } = (event.notification.data ?? {}) as { momentId?: string; gapId?: string }

  if (!momentId || !gapId) return

  event.waitUntil(
    (async () => {
      await dbEngagements.add({
        moment_id: momentId,
        gap_id: gapId,
        action: 'dismissed',
        timestamp: new Date().toISOString()
      })

      const current = await readPrefs()
      await writePrefs({
        consecutive_dismissals: (current.consecutive_dismissals ?? 0) + 1
      })
    })()
  )
})

// ---------------------------------------------------------------------------
// message event
// ---------------------------------------------------------------------------

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
