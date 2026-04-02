import { describe, it, expect } from 'vitest'
import { selectMoment } from '../../app/utils/selectMoment'
import type { Moment, Engagement, Prefs } from '../../app/composables/useDB'
import type { DetectedGap } from '../../app/utils/detectGaps'

describe('selectMoment', () => {
  const createMoment = (
    id: string,
    type: Moment['type'],
    minDuration: number,
    maxDuration: number,
    week: number,
    tags: string[] = []
  ): Moment => ({
    id,
    type,
    copy: {
      direct: 'Direct copy',
      reflective: 'Reflective copy'
    },
    why_it_works: 'Test reason',
    min_duration: minDuration,
    max_duration: maxDuration,
    available_from_week: week,
    tags
  })

  const createGap = (durationMinutes: number, hour: number = 10): DetectedGap => {
    const start = new Date('2024-01-15T00:00:00')
    start.setHours(hour)
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
    return {
      id: 'test-gap',
      start,
      end,
      duration_minutes: durationMinutes
    }
  }

  const defaultPrefs: Prefs = {
    style: 'direct',
    week_number: 3
  }

  describe('Factor 1: Gap duration filter', () => {
    it('should filter out moments outside gap duration range', () => {
      const gap = createGap(10) // 10-minute gap
      const moments = [
        createMoment('m1', 'breath', 5, 15, 1), // Fits
        createMoment('m2', 'physical', 15, 30, 1), // Too long
        createMoment('m3', 'breath', 1, 5, 1) // Too short
      ]

      const selected = selectMoment(gap, moments, defaultPrefs)
      expect(selected?.id).toBe('m1')
    })

    it('should return null if no moments fit the gap duration', () => {
      const gap = createGap(3) // Very short gap
      const moments = [
        createMoment('m1', 'breath', 5, 15, 1),
        createMoment('m2', 'physical', 10, 30, 1)
      ]

      const selected = selectMoment(gap, moments, defaultPrefs)
      expect(selected).toBeNull()
    })
  })

  describe('Factor 2: Time of day weighting', () => {
    it('should prefer physical/breath in morning', () => {
      const gap = createGap(20, 9) // 9 AM
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1),
        createMoment('m2', 'reflection', 5, 30, 1),
        createMoment('m3', 'physical', 5, 30, 1)
      ]

      const selected = selectMoment(gap, moments, defaultPrefs)
      // Should prefer breath or physical
      expect(['breath', 'physical']).toContain(selected?.type)
    })

    it('should prefer reflection in afternoon', () => {
      const gap = createGap(20, 15) // 3 PM
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1),
        createMoment('m2', 'reflection', 5, 30, 1),
        createMoment('m3', 'physical', 5, 30, 1)
      ]

      // Run multiple times to account for randomization in ties
      const selections = []
      for (let i = 0; i < 10; i++) {
        const selected = selectMoment(gap, moments, defaultPrefs)
        if (selected) selections.push(selected.type)
      }

      // Reflection should be selected more often
      const reflectionCount = selections.filter(t => t === 'reflection').length
      expect(reflectionCount).toBeGreaterThan(3)
    })
  })

  describe('Factor 3: Week-based progressive unlocking', () => {
    it('should only show moments available for current week', () => {
      const gap = createGap(20)
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1), // Week 1
        createMoment('m2', 'grounding', 5, 30, 3), // Week 3
        createMoment('m3', 'reflection', 5, 30, 5), // Week 5
        createMoment('m4', 'sensory', 5, 30, 6) // Week 6
      ]

      const prefs: Prefs = { ...defaultPrefs, week_number: 3 }
      const selected = selectMoment(gap, moments, prefs)

      // Should only select from week 1 or 3
      expect(['m1', 'm2']).toContain(selected?.id)
      expect(['m3', 'm4']).not.toContain(selected?.id)
    })
  })

  describe('Factor 5: Recency penalty', () => {
    it('should penalize recently shown moment types', () => {
      const gap = createGap(20)
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1),
        createMoment('m2', 'physical', 5, 30, 1),
        createMoment('m3', 'breath', 5, 30, 1) // Another breath
      ]

      // Recent engagement with breath type
      const recentEngagements: Engagement[] = [
        {
          moment_id: 'm1',
          gap_id: 'prev-gap',
          action: 'completed',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
        }
      ]

      // Run multiple times to check pattern
      const selections = []
      for (let i = 0; i < 10; i++) {
        const selected = selectMoment(gap, moments, defaultPrefs, recentEngagements)
        if (selected) selections.push(selected.type)
      }

      // Physical should be selected more often due to recency penalty on breath
      const physicalCount = selections.filter(t => t === 'physical').length
      expect(physicalCount).toBeGreaterThan(5)
    })
  })

  describe('Factor 6: Engagement history penalty', () => {
    it('should penalize types with high dismissal rate', () => {
      const gap = createGap(20)
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1),
        createMoment('m2', 'physical', 5, 30, 1),
        createMoment('m3', 'breath', 5, 30, 1)
      ]

      // High dismissal rate for breath type
      const engagements: Engagement[] = [
        {
          moment_id: 'm1',
          gap_id: 'gap1',
          action: 'dismissed',
          timestamp: new Date(Date.now() - 3 * + 24 * 60 * 60 * 1000).toISOString()
        },
        {
          moment_id: 'm3',
          gap_id: 'gap2',
          action: 'dismissed',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          moment_id: 'm2',
          gap_id: 'gap3',
          action: 'completed',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      // Run multiple times
      const selections = []
      for (let i = 0; i < 10; i++) {
        const selected = selectMoment(gap, moments, defaultPrefs, engagements)
        if (selected) selections.push(selected.type)
      }

      // Physical should be selected more often
      const physicalCount = selections.filter(t => t === 'physical').length
      expect(physicalCount).toBeGreaterThan(5)
    })
  })

  describe('Tag-based bonuses', () => {
    it('should prefer quick moments for short gaps', () => {
      const gap = createGap(8) // Short gap
      const moments = [
        createMoment('m1', 'breath', 5, 10, 1, ['quick']),
        createMoment('m2', 'physical', 5, 10, 1, ['long'])
      ]

      const selections = []
      for (let i = 0; i < 10; i++) {
        const selected = selectMoment(gap, moments, defaultPrefs)
        if (selected) selections.push(selected.id)
      }

      // Quick moment should be selected more
      const quickCount = selections.filter(id => id === 'm1').length
      expect(quickCount).toBeGreaterThan(5)
    })

    it('should prefer morning-tagged moments in morning', () => {
      const gap = createGap(20, 8) // 8 AM
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1, ['morning']),
        createMoment('m2', 'breath', 5, 30, 1, ['afternoon'])
      ]

      const selections = []
      for (let i = 0; i < 10; i++) {
        const selected = selectMoment(gap, moments, defaultPrefs)
        if (selected) selections.push(selected.id)
      }

      // Morning moment should be selected more
      const morningCount = selections.filter(id => id === 'm1').length
      expect(morningCount).toBeGreaterThan(5)
    })
  })

  describe('Edge cases', () => {
    it('should handle empty moments array', () => {
      const gap = createGap(20)
      const moments: Moment[] = []

      const selected = selectMoment(gap, moments, defaultPrefs)
      expect(selected).toBeNull()
    })

    it('should handle random tie-breaking for equal scores', () => {
      const gap = createGap(20)
      const moments = [
        createMoment('m1', 'breath', 5, 30, 1),
        createMoment('m2', 'breath', 5, 30, 1),
        createMoment('m3', 'breath', 5, 30, 1)
      ]

      // Run multiple times and check for variety
      const selections = new Set()
      for (let i = 0; i < 20; i++) {
        const selected = selectMoment(gap, moments, defaultPrefs)
        if (selected) selections.add(selected.id)
      }

      // Should select different moments due to random tie-breaking
      expect(selections.size).toBeGreaterThan(1)
    })
  })
})