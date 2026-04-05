<template>
  <main class="container status-view">
    <header class="header">
      <div class="logo">
        <svg width="40" height="40" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="60" r="20" fill="var(--accent)" opacity="0.8"/>
          <path d="M20 60 Q40 20 60 60" stroke="var(--accent)" stroke-width="3" fill="none"/>
        </svg>
        <span>Sunlight</span>
      </div>

      <button type="button" class="settings-button ghost" @click="showSettings = true">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 12.5C11.38 12.5 12.5 11.38 12.5 10C12.5 8.62 11.38 7.5 10 7.5C8.62 7.5 7.5 8.62 7.5 10C7.5 11.38 8.62 12.5 10 12.5Z" stroke="currentColor" stroke-width="1.5"/>
          <path d="M1 10.5V9.5C1 8.9 1.4 8.5 2 8.5C3.1 8.5 3.7 7.6 3.2 6.7C2.9 6.1 3.1 5.4 3.8 5.1L4.7 4.6C5.3 4.3 6.1 4.5 6.4 5.1L6.5 5.3C7 6.2 8 6.2 8.5 5.3L8.6 5.1C8.9 4.5 9.7 4.3 10.3 4.6L11.2 5.1C11.9 5.4 12.1 6.1 11.8 6.8C11.3 7.7 11.9 8.6 13 8.6C13.6 8.6 14 9 14 9.6V10.4C14 11 13.6 11.4 13 11.4C11.9 11.4 11.3 12.3 11.8 13.2C12.1 13.8 11.9 14.5 11.2 14.8L10.3 15.3C9.7 15.6 9 15.4 8.7 14.8L8.6 14.6C8.1 13.7 7.1 13.7 6.6 14.6L6.5 14.8C6.2 15.4 5.4 15.6 4.8 15.3L3.9 14.8C3.2 14.5 3 13.8 3.3 13.1C3.8 12.2 3.2 11.3 2.1 11.3C1.4 11.4 1 11 1 10.5Z" stroke="currentColor" stroke-width="1.5"/>
        </svg>
      </button>
    </header>

    <div class="status-content">
      <div class="next-gap card" v-if="nextGap">
        <h3>Next quiet moment</h3>
        <div class="gap-info">
          <p class="gap-time">{{ formatGapTime(nextGap) }}</p>
          <p class="gap-duration">{{ nextGap.duration_minutes }} minutes available</p>
        </div>
      </div>

      <div class="no-gaps card" v-else>
        <h3>No gaps detected today</h3>
        <p>Your calendar is clear or fully booked. Check back later.</p>
      </div>

      <div class="last-moment card" v-if="lastMoment">
        <h3>Last moment</h3>
        <p class="moment-title">{{ lastMoment.title }}</p>
        <p class="moment-time">{{ formatRelativeTime(lastMoment.time) }}</p>
      </div>

      <div class="weekly-insight card" v-if="showWeeklyInsight && weeklyInsight">
        <h3>Your week in one thought</h3>
        <p class="insight-text">{{ weeklyInsight }}</p>
        <NuxtLink to="/insight" class="read-more ghost">
          Read more →
        </NuxtLink>
      </div>

      <div class="quick-actions">
        <button type="button" class="secondary" @click="triggerManualMoment">
          Take a moment now
        </button>
      </div>
    </div>

    <SettingsModal v-model:open="showSettings" v-model:prefs="userPrefs" />
  </main>
</template>

<script setup lang="ts">
import type { DetectedGap } from '~/utils/detectGaps'
import { formatRelativeTime, getTimeUntil } from '~/utils/intl-formatters'

const router = useRouter()

const nextGap = shallowRef<DetectedGap | null>(null)
const lastMoment = shallowRef<{ title: string; time: Date } | null>(null)
const weeklyInsight = ref<string | null>(null)
const showWeeklyInsight = ref(false)
const showSettings = ref(false)
const userPrefs = shallowRef({
  style: 'direct' as 'direct' | 'reflective',
  working_hours_start: '08:00',
  working_hours_end: '18:00'
})

// Load user preferences
onMounted(async () => {
  const { prefs } = useDB()

  const savedPrefs = await prefs.get()
  // FIXME: Dexie already provide defaults for these values.
  userPrefs.value = {
    style: savedPrefs.style || 'direct',
    working_hours_start: savedPrefs.working_hours_start || '08:00',
    working_hours_end: savedPrefs.working_hours_end || '18:00'
  }

  // Check if it's Sunday evening for weekly insight
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  showWeeklyInsight.value = day === 0 && hour >= 18 // Sunday after 6pm

  if (showWeeklyInsight.value && savedPrefs.last_insight) {
    weeklyInsight.value = savedPrefs.last_insight
  }

  // Load next gap (this would normally come from service worker)
  await checkForNextGap()

  // Load last moment served
  await loadLastMoment()
})

const checkForNextGap = async () => {
  // This is a placeholder - in production, gap detection happens in service worker
  // For now, we'll create a mock gap
  const now = new Date()
  const gapStart = new Date(now.getTime() + 15 * 60 * 1000) // 15 minutes from now
  const gapEnd = new Date(gapStart.getTime() + 12 * 60 * 1000) // 12-minute gap

  nextGap.value = {
    id: 'mock-gap',
    start: gapStart,
    end: gapEnd,
    duration_minutes: 12
  }
}

const loadLastMoment = async () => {
  const { engagements } = useDB()

  const recentEngagements = await engagements.getRecent(24)
  if (recentEngagements.length === 0) return

  const latestEngagement = recentEngagements[0]!
  const moment = await queryCollection('moments')
    .where('stem', '=', `moments/${latestEngagement.moment_id}`)
    .first()

  if (moment) {
    lastMoment.value = {
      title: moment.copy[userPrefs.value.style],
      time: new Date(latestEngagement.timestamp)
    }
  }
}

const formatGapTime = (gap: DetectedGap): string => {
  const now = new Date()
  const { value, unit } = getTimeUntil(gap.start, now)

  if (value <= 0) {
    return 'Now'
  } else if (unit === 'minute' && value < 60) {
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'always', style: 'short' })
    return formatter.format(value, 'minute')
  } else {
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(gap.start)
  }
}

const triggerManualMoment = async () => {
  const allMoments = await queryCollection('moments').all()
  if (allMoments.length > 0) {
    const randomMoment = allMoments[Math.floor(Math.random() * allMoments.length)]!
    router.push(`/moment/${randomMoment.stem.replace('moments/', '')}`)
  }
}

</script>

<style scoped>
.status-view {
  min-height: 100vh;
  padding-top: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-2xl);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text);
}

.settings-button {
  padding: var(--spacing-sm);
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
}

.card h3 {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  margin-bottom: var(--spacing-md);
}

.gap-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.gap-time {
  font-size: var(--text-2xl);
  font-family: var(--font-heading);
  color: var(--text);
}

.gap-duration {
  color: var(--accent);
  font-size: var(--text-base);
}

.moment-title {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
}

.moment-time {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.insight-text {
  font-family: var(--font-body);
  line-height: 1.6;
  color: var(--text);
  margin-bottom: var(--spacing-md);
}

.quick-actions {
  display: flex;
  justify-content: center;
  margin-top: var(--spacing-xl);
}

</style>
