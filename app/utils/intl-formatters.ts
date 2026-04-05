/**
 * Internationalization utility functions using Intl APIs
 * for proper locale-aware date and time formatting
 */

/**
 * Format relative time like "2 minutes ago", "in 3 hours", etc.
 * Automatically chooses the best unit (seconds, minutes, hours, days)
 */
export function formatRelativeTime(date: Date, baseDate: Date = new Date()): string {
  const formatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
    style: 'long'
  })

  const diffMs = date.getTime() - baseDate.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  // Choose the most appropriate unit
  if (Math.abs(diffSec) < 60) {
    return formatter.format(diffSec, 'second')
  } else if (Math.abs(diffMin) < 60) {
    return formatter.format(diffMin, 'minute')
  } else if (Math.abs(diffHour) < 24) {
    return formatter.format(diffHour, 'hour')
  } else if (Math.abs(diffDay) < 30) {
    return formatter.format(diffDay, 'day')
  } else {
    const diffMonth = Math.round(diffDay / 30)
    return formatter.format(diffMonth, 'month')
  }
}

/**
 * Format a time string like "08:00" or "18:00" using locale settings
 */
export function formatTime(hours: number, minutes: number = 0): string {
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)

  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

/**
 * Parse a time string like "08:00" or "8:00 AM" to hours and minutes
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } {
  // Handle 24-hour format (e.g., "08:00", "18:30")
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return {
      hours: parseInt(match24[1], 10),
      minutes: parseInt(match24[2], 10)
    }
  }

  // Handle 12-hour format (e.g., "8:00 AM", "6:30 PM")
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let hours = parseInt(match12[1], 10)
    const minutes = parseInt(match12[2], 10)
    const isPM = match12[3].toUpperCase() === 'PM'

    if (isPM && hours !== 12) hours += 12
    if (!isPM && hours === 12) hours = 0

    return { hours, minutes }
  }

  // Default fallback
  return { hours: 0, minutes: 0 }
}

/**
 * Convert time to minutes since midnight
 */
export function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes
}

/**
 * Parse time string to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr)
  return timeToMinutes(hours, minutes)
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(date1) === new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(date2)
}

/**
 * Get localized day period (morning, afternoon, evening, night)
 */
export function getDayPeriod(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = date.getHours()

  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`
}

/**
 * Format a date range (e.g., "10:00 AM - 11:30 AM" or "Jan 15 - Jan 17")
 */
export function formatDateRange(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  // Same day - just show times
  if (isSameDay(start, end)) {
    return `${formatter.format(start)} - ${formatter.format(end)}`
  }

  // Different days - show full dates
  const dateFormatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })

  return `${dateFormatter.format(start)} - ${dateFormatter.format(end)}`
}

/**
 * Get time until a future date in the most appropriate unit
 */
export function getTimeUntil(futureDate: Date, now: Date = new Date()): { value: number; unit: Intl.RelativeTimeFormatUnit } {
  const diffMs = futureDate.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / (60 * 1000))
  const diffHour = Math.round(diffMs / (60 * 60 * 1000))
  const diffDay = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (Math.abs(diffMin) < 60) {
    return { value: diffMin, unit: 'minute' }
  } else if (Math.abs(diffHour) < 24) {
    return { value: diffHour, unit: 'hour' }
  } else {
    return { value: diffDay, unit: 'day' }
  }
}