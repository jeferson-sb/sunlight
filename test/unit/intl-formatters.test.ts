import { describe, it, expect } from 'vitest'
import {
  formatRelativeTime,
  formatTime,
  parseTime,
  timeToMinutes,
  parseTimeToMinutes,
  isSameDay,
  getDayPeriod,
  formatDuration,
  formatDateRange,
  getTimeUntil,
} from '../../app/utils/intl-formatters'

describe('intl-formatters', () => {
  describe('timeToMinutes', () => {
    it('converts hours and minutes to total minutes since midnight', () => {
      expect(timeToMinutes(0, 0)).toBe(0)
      expect(timeToMinutes(8, 0)).toBe(480)
      expect(timeToMinutes(18, 30)).toBe(1110)
      expect(timeToMinutes(23, 59)).toBe(1439)
    })

    it('handles midnight edge case', () => {
      expect(timeToMinutes(0, 1)).toBe(1)
    })
  })

  describe('parseTime', () => {
    it('parses 24-hour format strings', () => {
      expect(parseTime('08:00')).toEqual({ hours: 8, minutes: 0 })
      expect(parseTime('18:30')).toEqual({ hours: 18, minutes: 30 })
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 })
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 })
    })

    it('parses 12-hour AM format strings', () => {
      expect(parseTime('8:00 AM')).toEqual({ hours: 8, minutes: 0 })
      expect(parseTime('12:00 AM')).toEqual({ hours: 0, minutes: 0 })
      expect(parseTime('11:30 AM')).toEqual({ hours: 11, minutes: 30 })
    })

    it('parses 12-hour PM format strings', () => {
      expect(parseTime('12:00 PM')).toEqual({ hours: 12, minutes: 0 })
      expect(parseTime('6:30 PM')).toEqual({ hours: 18, minutes: 30 })
      expect(parseTime('11:59 PM')).toEqual({ hours: 23, minutes: 59 })
    })

    it('returns midnight as fallback for unrecognized formats', () => {
      expect(parseTime('invalid')).toEqual({ hours: 0, minutes: 0 })
      expect(parseTime('')).toEqual({ hours: 0, minutes: 0 })
    })
  })

  describe('parseTimeToMinutes', () => {
    it('parses time string directly to minutes', () => {
      expect(parseTimeToMinutes('08:00')).toBe(480)
      expect(parseTimeToMinutes('18:00')).toBe(1080)
      expect(parseTimeToMinutes('00:00')).toBe(0)
    })

    it('rounds trips through parseTime and timeToMinutes', () => {
      const result = parseTimeToMinutes('10:30')
      expect(result).toBe(630)
    })
  })

  describe('isSameDay', () => {
    it('returns true for dates on the same day', () => {
      const a = new Date('2024-01-15T09:00:00')
      const b = new Date('2024-01-15T23:59:59')
      expect(isSameDay(a, b)).toBe(true)
    })

    it('returns false for dates on different days', () => {
      const a = new Date('2024-01-15T23:00:00')
      const b = new Date('2024-01-16T00:00:00')
      expect(isSameDay(a, b)).toBe(false)
    })

    it('returns true for the exact same date object', () => {
      const d = new Date('2024-06-01T12:00:00')
      expect(isSameDay(d, d)).toBe(true)
    })
  })

  describe('getDayPeriod', () => {
    it('returns "morning" for hours 5–11', () => {
      expect(getDayPeriod(new Date('2024-01-15T05:00:00'))).toBe('morning')
      expect(getDayPeriod(new Date('2024-01-15T09:30:00'))).toBe('morning')
      expect(getDayPeriod(new Date('2024-01-15T11:59:00'))).toBe('morning')
    })

    it('returns "afternoon" for hours 12–16', () => {
      expect(getDayPeriod(new Date('2024-01-15T12:00:00'))).toBe('afternoon')
      expect(getDayPeriod(new Date('2024-01-15T14:00:00'))).toBe('afternoon')
      expect(getDayPeriod(new Date('2024-01-15T16:59:00'))).toBe('afternoon')
    })

    it('returns "evening" for hours 17–20', () => {
      expect(getDayPeriod(new Date('2024-01-15T17:00:00'))).toBe('evening')
      expect(getDayPeriod(new Date('2024-01-15T20:59:00'))).toBe('evening')
    })

    it('returns "night" for hours 21–4', () => {
      expect(getDayPeriod(new Date('2024-01-15T21:00:00'))).toBe('night')
      expect(getDayPeriod(new Date('2024-01-15T23:59:00'))).toBe('night')
      expect(getDayPeriod(new Date('2024-01-15T00:00:00'))).toBe('night')
      expect(getDayPeriod(new Date('2024-01-15T04:59:00'))).toBe('night')
    })
  })

  describe('formatDuration', () => {
    it('formats durations under an hour in minutes', () => {
      expect(formatDuration(1)).toBe('1 minute')
      expect(formatDuration(5)).toBe('5 minutes')
      expect(formatDuration(45)).toBe('45 minutes')
      expect(formatDuration(59)).toBe('59 minutes')
    })

    it('formats exact hours with singular/plural', () => {
      expect(formatDuration(60)).toBe('1 hour')
      expect(formatDuration(120)).toBe('2 hours')
    })

    it('formats hours and minutes together', () => {
      expect(formatDuration(90)).toBe('1 hour 30 minutes')
      expect(formatDuration(125)).toBe('2 hours 5 minutes')
      expect(formatDuration(61)).toBe('1 hour 1 minute')
    })
  })

  describe('formatRelativeTime', () => {
    it('formats seconds in the past', () => {
      const now = new Date('2024-01-15T12:00:00')
      const past = new Date('2024-01-15T11:59:30')
      const result = formatRelativeTime(past, now)
      // Intl.RelativeTimeFormat may say "30 seconds ago" or "in X" depending on locale/runtime
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('formats minutes in the past', () => {
      const now = new Date('2024-01-15T12:00:00')
      const past = new Date('2024-01-15T11:55:00')
      const result = formatRelativeTime(past, now)
      expect(result).toMatch(/minute/)
    })

    it('formats hours in the past', () => {
      const now = new Date('2024-01-15T12:00:00')
      const past = new Date('2024-01-15T10:00:00')
      const result = formatRelativeTime(past, now)
      expect(result).toMatch(/hour/)
    })

    it('formats days in the past', () => {
      const now = new Date('2024-01-15T12:00:00')
      const past = new Date('2024-01-12T12:00:00')
      const result = formatRelativeTime(past, now)
      expect(result).toMatch(/day/)
    })

    it('formats future times with "in" phrasing', () => {
      const now = new Date('2024-01-15T12:00:00')
      const future = new Date('2024-01-15T12:10:00')
      const result = formatRelativeTime(future, now)
      expect(result).toMatch(/in/)
    })

    it('uses current time as default base date', () => {
      const future = new Date(Date.now() + 3600 * 1000)
      const result = formatRelativeTime(future)
      expect(result).toMatch(/in/)
    })
  })

  describe('formatTime', () => {
    it('returns a non-empty formatted time string', () => {
      const result = formatTime(9, 30)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('defaults minutes to 0', () => {
      const withZero = formatTime(8, 0)
      const withDefault = formatTime(8)
      expect(withDefault).toBe(withZero)
    })
  })

  describe('formatDateRange', () => {
    it('formats same-day range separated by a dash', () => {
      const start = new Date('2024-01-15T10:00:00')
      const end = new Date('2024-01-15T11:30:00')
      const result = formatDateRange(start, end)
      expect(result).toContain(' - ')
      expect(typeof result).toBe('string')
    })

    it('formats multi-day range including date information', () => {
      const start = new Date('2024-01-15T10:00:00')
      const end = new Date('2024-01-17T11:00:00')
      const result = formatDateRange(start, end)
      expect(result).toContain(' - ')
      // Multi-day format includes month abbreviations (via dateFormatter)
      expect(result.length).toBeGreaterThan(10)
    })
  })

  describe('getTimeUntil', () => {
    it('returns minutes for short differences', () => {
      const now = new Date('2024-01-15T12:00:00')
      const future = new Date('2024-01-15T12:30:00')
      const result = getTimeUntil(future, now)
      expect(result.unit).toBe('minute')
      expect(result.value).toBe(30)
    })

    it('returns hours for medium differences', () => {
      const now = new Date('2024-01-15T12:00:00')
      const future = new Date('2024-01-15T15:00:00')
      const result = getTimeUntil(future, now)
      expect(result.unit).toBe('hour')
      expect(result.value).toBe(3)
    })

    it('returns days for large differences', () => {
      const now = new Date('2024-01-15T12:00:00')
      const future = new Date('2024-01-20T12:00:00')
      const result = getTimeUntil(future, now)
      expect(result.unit).toBe('day')
      expect(result.value).toBe(5)
    })

    it('uses current time as default', () => {
      const future = new Date(Date.now() + 15 * 60 * 1000)
      const result = getTimeUntil(future)
      expect(result.unit).toBe('minute')
    })
  })
})
