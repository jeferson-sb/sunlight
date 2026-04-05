import type { CalendarEvent } from '~/composables/useDB'

type RawCalendarEvent = {
  id?: string | null
  summary?: string | null
  start?: { dateTime?: string | null; date?: string | null } | null
  end?: { dateTime?: string | null; date?: string | null } | null
}
type CalendarComposable = {
  fetchTodayEvents: () => Promise<CalendarEvent[]>
  clearCache: () => Promise<void>
  isCalendarConnected: () => Promise<boolean>
}

export const useCalendar = (): CalendarComposable => {
  const { events: eventsDB } = useDB()

  // Fetch today's and tomorrow's events from Google Calendar
  const fetchTodayEvents = async (): Promise<CalendarEvent[]> => {
    // Check cache first (15 minutes)
    const cachedEvents = await eventsDB.get()
    if (cachedEvents.length > 0) {
      return cachedEvents
    }

    try {
      // Set time range for today and tomorrow
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

      // Use the server API endpoint that leverages googleapis package
      const data = await $fetch('/api/calendar/events', {
        params: {
          timeMin: startOfToday.toISOString(),
          timeMax: endOfTomorrow.toISOString()
        }
      })

      // Normalize events to our format
      const normalizedEvents: CalendarEvent[] = (data.items || []).map((event: RawCalendarEvent) => ({
        id: event.id ?? '',
        title: event.summary || 'Untitled Event',
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        isAllDay: !event.start?.dateTime
      }))

      // Filter out all-day events
      const timeEvents = normalizedEvents.filter(event => !event.isAllDay)

      // Cache the events
      await eventsDB.set(timeEvents)

      return timeEvents
    } catch (error: unknown) {
      // Handle specific error codes
      if (
        typeof error === 'object' &&
        error !== null &&
        'data' in error &&
        typeof (error as { data?: { statusCode?: number } }).data?.statusCode === 'number' &&
        (error as { data: { statusCode: number } }).data.statusCode === 401
      ) {
        console.error('Authentication required. Please sign in again.')
      } else {
        console.error('Failed to fetch calendar events:', error)
      }
      return []
    }
  }

  // Clear calendar cache
  const clearCache = async (): Promise<void> => {
    await eventsDB.clear()
  }

  // Check if calendar is connected by testing the API
  const isCalendarConnected = async (): Promise<boolean> => {
    try {
      // Try to fetch with a minimal time range to test the connection
      await $fetch('/api/calendar/events', {
        params: {
          timeMin: new Date().toISOString(),
          timeMax: new Date().toISOString()
        }
      })
      return true
    } catch {
      return false
    }
  }

  return {
    fetchTodayEvents,
    clearCache,
    isCalendarConnected
  }
}