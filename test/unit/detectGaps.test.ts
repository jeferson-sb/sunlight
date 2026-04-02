import { describe, it, expect } from 'vitest'
import { detectGaps } from '../../app/utils/detectGaps'
import type { CalendarEvent, Prefs } from '../../app/composables/useDB'

describe('detectGaps', () => {
  const createEvent = (start: Date, end: Date): CalendarEvent => ({
    id: `event-${start.getTime()}`,
    title: 'Test Event',
    start: start.toISOString(),
    end: end.toISOString(),
    isAllDay: false
  })

  const defaultPrefs: Prefs = {
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    consecutive_dismissals: 0,
    week_number: 1
  }

  describe('Rule 1: Gap duration between 5-45 minutes', () => {
    it('should reject gaps shorter than 5 minutes', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:02:00'),
          new Date('2024-01-15T10:30:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull() // 2-minute gap is too short
    })

    it('should reject gaps longer than 45 minutes', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T11:00:00'),
          new Date('2024-01-15T12:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull() // 60-minute gap is too long
    })

    it('should accept gaps between 5-45 minutes', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:15:00'),
          new Date('2024-01-15T11:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).not.toBeNull()
      expect(gap?.duration_minutes).toBe(15)
    })
  })

  describe('Rule 2: Within working hours', () => {
    it('should reject gaps before working hours', () => {
      const now = new Date('2024-01-15T07:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T07:30:00'),
          new Date('2024-01-15T08:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull() // Before 9:00 AM
    })

    it('should reject gaps after working hours', () => {
      const now = new Date('2024-01-15T17:30:00')
      const events = [
        createEvent(
          new Date('2024-01-15T18:00:00'),
          new Date('2024-01-15T18:30:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull() // After 5:00 PM
    })

    it('should accept gaps within working hours', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:15:00'),
          new Date('2024-01-15T11:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).not.toBeNull()
    })
  })

  describe('Rule 3: Last notification more than 2 hours ago', () => {
    it('should reject if notified less than 2 hours ago', () => {
      const now = new Date('2024-01-15T12:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T12:15:00'),
          new Date('2024-01-15T13:00:00')
        )
      ]

      const prefs: Prefs = {
        ...defaultPrefs,
        last_notified_at: new Date('2024-01-15T10:30:00').toISOString() // 1.5 hours ago
      }

      const gap = detectGaps(events, now, prefs)
      expect(gap).toBeNull()
    })

    it('should accept if notified more than 2 hours ago', () => {
      const now = new Date('2024-01-15T12:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T12:15:00'),
          new Date('2024-01-15T13:00:00')
        )
      ]

      const prefs: Prefs = {
        ...defaultPrefs,
        last_notified_at: new Date('2024-01-15T09:00:00').toISOString() // 3 hours ago
      }

      const gap = detectGaps(events, now, prefs)
      expect(gap).not.toBeNull()
    })
  })

  describe('Rule 4: Consecutive dismissals', () => {
    it('should reject if 3 or more consecutive dismissals', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:15:00'),
          new Date('2024-01-15T11:00:00')
        )
      ]

      const prefs: Prefs = {
        ...defaultPrefs,
        consecutive_dismissals: 3
      }

      const gap = detectGaps(events, now, prefs)
      expect(gap).toBeNull()
    })

    it('should reset dismissals on new day', () => {
      const now = new Date('2024-01-16T10:00:00') // Next day
      const events = [
        createEvent(
          new Date('2024-01-16T10:15:00'),
          new Date('2024-01-16T11:00:00')
        )
      ]

      const prefs: Prefs = {
        ...defaultPrefs,
        consecutive_dismissals: 3,
        last_notified_at: new Date('2024-01-15T15:00:00').toISOString() // Yesterday
      }

      const gap = detectGaps(events, now, prefs)
      expect(gap).not.toBeNull() // Should work on new day
    })
  })

  describe('Rule 5: Gaps within next 60 minutes', () => {
    it('should reject gaps more than 60 minutes away', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T11:30:00'), // 90 minutes away
          new Date('2024-01-15T12:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull()
    })

    it('should accept gaps within 60 minutes', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:30:00'), // 30 minutes away
          new Date('2024-01-15T11:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).not.toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('should handle back-to-back meetings', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:00:00'),
          new Date('2024-01-15T10:30:00')
        ),
        createEvent(
          new Date('2024-01-15T10:30:00'), // No gap
          new Date('2024-01-15T11:00:00')
        ),
        createEvent(
          new Date('2024-01-15T11:00:00'), // No gap
          new Date('2024-01-15T11:30:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull()
    })

    it('should handle empty events array', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events: CalendarEvent[] = []

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).toBeNull()
    })

    it('should find gap between consecutive events', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T09:00:00'),
          new Date('2024-01-15T10:00:00')
        ),
        createEvent(
          new Date('2024-01-15T10:15:00'), // 15-minute gap
          new Date('2024-01-15T11:00:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).not.toBeNull()
      expect(gap?.duration_minutes).toBe(15)
    })

    it('should return soonest qualifying gap when multiple exist', () => {
      const now = new Date('2024-01-15T10:00:00')
      const events = [
        createEvent(
          new Date('2024-01-15T10:10:00'), // 10-minute gap (first)
          new Date('2024-01-15T10:30:00')
        ),
        createEvent(
          new Date('2024-01-15T10:45:00'), // 15-minute gap (second)
          new Date('2024-01-15T11:15:00')
        )
      ]

      const gap = detectGaps(events, now, defaultPrefs)
      expect(gap).not.toBeNull()
      expect(gap?.duration_minutes).toBe(10)
      expect(gap?.start.getHours()).toBe(10)
      expect(gap?.start.getMinutes()).toBe(0)
    })
  })
})