import type { Moment, Engagement, Prefs } from '~/composables/useDB'
import type { DetectedGap } from './detectGaps'

interface ScoredMoment {
  moment: Moment
  score: number
}

/**
 * Selects the best moment for a given gap
 * Implements 6-factor scoring system:
 * 1. Gap duration (filter)
 * 2. Time of day weighting
 * 3. Week number (filter)
 * 4. Style preference (filter)
 * 5. Recency penalty
 * 6. Engagement history penalty
 */
export function selectMoment(
  gap: DetectedGap,
  moments: Moment[],
  prefs: Prefs,
  recentEngagements: Engagement[] = []
): Moment | null {
  const now = new Date()
  const currentHour = gap.start.getHours()
  const ismorning = currentHour < 12
  const userStyle = prefs.style || 'direct'
  const weekNumber = prefs.week_number || 1

  // Filter moments by basic criteria
  const eligibleMoments = moments.filter(moment => {
    // Factor 1: Gap duration filter
    if (gap.duration_minutes < moment.min_duration || gap.duration_minutes > moment.max_duration) {
      return false
    }

    // Factor 3: Week-based progressive unlocking
    if (moment.available_from_week > weekNumber) {
      return false
    }

    return true
  })

  if (eligibleMoments.length === 0) {
    return null
  }

  // Calculate engagement statistics
  const engagementStats = calculateEngagementStats(recentEngagements, moments)

  // Score each moment
  const scoredMoments: ScoredMoment[] = eligibleMoments.map(moment => {
    let score = 10 // Base score

    // Factor 2: Time of day weighting
    if (ismorning) {
      // Morning: prefer physical and breath
      if (moment.type === 'physical' || moment.type === 'breath') {
        score += 2
      }
    } else {
      // Afternoon: prefer reflection
      if (moment.type === 'reflection') {
        score += 2
      }
    }

    // Factor 5: Recency penalty (last 48 hours)
    const recentOfSameType = recentEngagements.filter(e => {
      const engagedMoment = moments.find(m => m.id === e.moment_id)
      return engagedMoment?.type === moment.type
    })

    if (recentOfSameType.length > 0) {
      // Check how recently this type was shown
      const mostRecent = recentOfSameType
        .map(e => new Date(e.timestamp).getTime())
        .sort((a, b) => b - a)[0]

      const hoursSinceLastShown = (now.getTime() - mostRecent) / (1000 * 60 * 60)

      if (hoursSinceLastShown < 48) {
        score -= 3 // Significant penalty for recent repetition
      }
    }

    // Factor 6: Engagement history penalty
    const typeStats = engagementStats[moment.type]
    if (typeStats && typeStats.total > 0) {
      const dismissalRate = typeStats.dismissed / typeStats.total
      if (dismissalRate > 0.5) {
        score -= 2 // Penalty for high dismissal rate
      }
    }

    // Bonus for variety - if this type hasn't been shown recently
    const typeCount = recentOfSameType.length
    if (typeCount === 0) {
      score += 1 // Small bonus for variety
    }

    // Tag-based contextual bonus
    if (gap.duration_minutes <= 10 && moment.tags.includes('quick')) {
      score += 1
    }
    if (ismorning && moment.tags.includes('morning')) {
      score += 1
    }
    if (!ismorning && moment.tags.includes('afternoon')) {
      score += 1
    }

    return { moment, score }
  })

  // Sort by score (highest first) and handle ties with randomization
  scoredMoments.sort((a, b) => {
    if (a.score === b.score) {
      // Random tie-breaker
      return Math.random() - 0.5
    }
    return b.score - a.score
  })

  // Return the highest scoring moment
  return scoredMoments[0]?.moment || null
}

/**
 * Calculate engagement statistics by moment type
 */
function calculateEngagementStats(
  engagements: Engagement[],
  moments: Moment[]
): Record<string, { total: number; completed: number; dismissed: number; skipped: number }> {
  const stats: Record<string, { total: number; completed: number; dismissed: number; skipped: number }> = {}

  // Initialize stats for each moment type
  const momentTypes = new Set(moments.map(m => m.type))
  momentTypes.forEach(type => {
    stats[type] = { total: 0, completed: 0, dismissed: 0, skipped: 0 }
  })

  // Count engagements by type
  engagements.forEach(engagement => {
    const moment = moments.find(m => m.id === engagement.moment_id)
    if (moment) {
      const typeStats = stats[moment.type]
      if (typeStats) {
        typeStats.total++
        typeStats[engagement.action]++
      }
    }
  })

  return stats
}

/**
 * Get a moment's copy based on user's style preference
 */
export function getMomentCopy(moment: Moment, style: 'direct' | 'reflective'): string {
  return moment.copy[style]
}