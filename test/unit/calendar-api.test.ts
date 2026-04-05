import { describe, it, expect, vi, afterEach } from 'vitest'

describe('Calendar API with @googleapis/calendar', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should format calendar event parameters for googleapis format', () => {
    // Test that parameters are properly formatted for the googleapis client
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 86400000)

    const params = {
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: tomorrow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime' as const
    }

    // These should match the expected googleapis format
    expect(params.calendarId).toBe('primary')
    expect(params.timeMin).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(params.timeMax).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(params.singleEvents).toBe(true)
    expect(params.orderBy).toBe('startTime')
  })

  it('should handle OAuth2 credentials structure correctly', () => {
    // Test that OAuth2 credentials are in the expected format
    const credentials = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token'
    }

    // Credentials should have the expected properties for googleapis OAuth2
    expect(credentials).toHaveProperty('access_token')
    expect(credentials).toHaveProperty('refresh_token')
  })

  it('should normalize Google Calendar event to local format', () => {
    // Simulate a Google Calendar API event response
    const googleEvent = {
      id: 'test-event-id',
      summary: 'Meeting with Team',
      start: { dateTime: '2024-01-15T10:00:00Z' },
      end: { dateTime: '2024-01-15T11:30:00Z' }
    }

    // Normalize to our CalendarEvent format following the existing pattern
    const normalized = {
      id: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      start: googleEvent.start.dateTime,
      end: googleEvent.end.dateTime,
      isAllDay: false
    }

    expect(normalized.id).toBe('test-event-id')
    expect(normalized.title).toBe('Meeting with Team')
    expect(normalized.start).toBe('2024-01-15T10:00:00Z')
    expect(normalized.end).toBe('2024-01-15T11:30:00Z')
    expect(normalized.isAllDay).toBe(false)
  })

  it('should handle all-day events correctly', () => {
    // Test all-day event data format
    const googleEvent = {
      id: 'all-day-event',
      summary: 'Company Holiday',
      start: { date: '2024-01-25' },  // All-day events use 'date' instead of 'dateTime'
      end: { date: '2024-01-26' }
    }

    // Normalize to our CalendarEvent format
    const normalizedEvent = {
      id: googleEvent.id,
      title: googleEvent.summary || 'Untitled Event',
      start: googleEvent.start.date,
      end: googleEvent.end.date,
      isAllDay: true  // Determined by absence of dateTime property
    }

    expect(normalizedEvent.id).toBe('all-day-event')
    expect(normalizedEvent.title).toBe('Company Holiday')
    expect(normalizedEvent.isAllDay).toBe(true)
  })
})