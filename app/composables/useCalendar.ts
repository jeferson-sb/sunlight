import type { CalendarEvent } from '~/composables/useDB'

export const useCalendar = () => {
  const { getGoogleAccessToken, refreshGoogleToken } = useAuth()
  const { events: eventsDB } = useDB()

  // Fetch today's and tomorrow's events from Google Calendar
  const fetchTodayEvents = async (): Promise<CalendarEvent[]> => {
    // Check cache first (15 minutes)
    const cachedEvents = await eventsDB.get()
    if (cachedEvents.length > 0) {
      return cachedEvents
    }

    try {
      // Get access token
      let accessToken = await getGoogleAccessToken()
      if (!accessToken) {
        throw new Error('No access token available')
      }

      // Set time range for today and tomorrow
      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2)

      const params = new URLSearchParams({
        timeMin: startOfToday.toISOString(),
        timeMax: endOfTomorrow.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime'
      })

      // Fetch events from Google Calendar API
      let response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      // If 401, try refreshing token
      if (response.status === 401) {
        await refreshGoogleToken()
        accessToken = await getGoogleAccessToken()

        if (!accessToken) {
          throw new Error('Failed to refresh token')
        }

        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        )
      }

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`)
      }

      const data = await response.json()

      // Normalize events to our format
      const normalizedEvents: CalendarEvent[] = (data.items || []).map((event: any) => ({
        id: event.id,
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
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      return []
    }
  }

  // Clear calendar cache
  const clearCache = async () => {
    await eventsDB.clear()
  }

  // Check if calendar is connected
  const isCalendarConnected = async (): Promise<boolean> => {
    try {
      const accessToken = await getGoogleAccessToken()
      return !!accessToken
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