import type { CalendarEvent, Prefs } from '~/composables/useDB'
import { parseTimeToMinutes, isSameDay, timeToMinutes } from './intl-formatters'

export interface DetectedGap {
  id: string
  start: Date
  end: Date
  duration_minutes: number
}

/**
 * Detects qualifying gaps in the user's calendar
 * Implements 5 rules from the spec:
 * 1. Gap must be between 5 and 45 minutes
 * 2. Gap must fall within working hours
 * 3. Last notification must have been more than 2 hours ago
 * 4. If consecutive_dismissals >= 3, skip and reset counter next day
 * 5. Only gaps starting within the next 60 minutes are considered
 */
export function detectGaps(
  events: CalendarEvent[],
  now: Date,
  prefs: Prefs
): DetectedGap | null {
  // Rule 4: Check consecutive dismissals
  if ((prefs.consecutive_dismissals || 0) >= 3) {
    // Check if it's a new day to reset
    const lastNotified = prefs.last_notified_at ? new Date(prefs.last_notified_at) : null
    if (lastNotified) {
      const isNewDay = !isSameDay(now, lastNotified)
      if (!isNewDay) {
        return null // Still backing off
      }
    } else {
      // No last notification date, so skip due to dismissals
      return null
    }
  }

  // Rule 3: Check if enough time has passed since last notification
  if (prefs.last_notified_at) {
    const timeSinceLastNotification = now.getTime() - new Date(prefs.last_notified_at).getTime()
    const twoHoursInMs = 2 * 60 * 60 * 1000
    if (timeSinceLastNotification < twoHoursInMs) {
      return null
    }
  }

  // Parse working hours
  const workStart = parseTimeToMinutes(prefs.working_hours_start || '08:00')
  const workEnd = parseTimeToMinutes(prefs.working_hours_end || '18:00')
  const nowMinutes = timeToMinutes(now.getHours(), now.getMinutes())

  // Filter out all-day events and sort by start time
  const timeEvents = events
    .filter(e => !e.isAllDay)
    .map(e => ({
      ...e,
      startDate: new Date(e.start),
      endDate: new Date(e.end)
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  // Find gaps
  const gaps: DetectedGap[] = []

  // Check for gap before first event
  if (timeEvents.length > 0) {
    const firstEvent = timeEvents[0]
    const gapEnd = firstEvent.startDate
    const gapStart = now

    if (gapEnd.getTime() > gapStart.getTime()) {
      const durationMinutes = Math.floor((gapEnd.getTime() - gapStart.getTime()) / (60 * 1000))
      gaps.push({
        id: `gap-before-${firstEvent.id}`,
        start: gapStart,
        end: gapEnd,
        duration_minutes: durationMinutes
      })
    }
  }

  // Check for gaps between consecutive events
  for (let i = 0; i < timeEvents.length - 1; i++) {
    const currentEvent = timeEvents[i]
    const nextEvent = timeEvents[i + 1]

    const gapStart = currentEvent.endDate
    const gapEnd = nextEvent.startDate

    // Only consider future gaps (gap starts at or after now)
    if (gapStart.getTime() >= now.getTime()) {
      const durationMinutes = Math.floor((gapEnd.getTime() - gapStart.getTime()) / (60 * 1000))
      gaps.push({
        id: `gap-${currentEvent.id}-${nextEvent.id}`,
        start: gapStart,
        end: gapEnd,
        duration_minutes: durationMinutes
      })
    }
  }

  // Filter gaps by rules
  const qualifyingGaps = gaps.filter(gap => {
    // Rule 1: Duration between 5 and 45 minutes
    if (gap.duration_minutes < 5 || gap.duration_minutes > 45) {
      return false
    }

    // Rule 2: Within working hours
    const gapStartMinutes = timeToMinutes(gap.start.getHours(), gap.start.getMinutes())
    const gapEndMinutes = timeToMinutes(gap.end.getHours(), gap.end.getMinutes())

    if (gapStartMinutes < workStart || gapEndMinutes > workEnd) {
      return false
    }

    // Rule 5: Starting within next 60 minutes
    const timeUntilGap = gap.start.getTime() - now.getTime()
    const sixtyMinutesInMs = 60 * 60 * 1000

    if (timeUntilGap < 0 || timeUntilGap > sixtyMinutesInMs) {
      return false
    }

    return true
  })

  // Return the soonest qualifying gap
  if (qualifyingGaps.length > 0) {
    return qualifyingGaps.sort((a, b) => a.start.getTime() - b.start.getTime())[0]
  }

  return null
}

// parseTimeToMinutes is now imported from intl-formatters.ts