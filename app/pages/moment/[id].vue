<template>
  <main class="full-screen moment-screen">
    <div class="warm-overlay"></div>

    <div class="content fade-in" v-if="moment">
      <div class="moment-copy">
        <p>{{ momentCopy }}</p>
      </div>

      <div class="duration-indicator">
        <span>~{{ moment.min_duration }}-{{ moment.max_duration }} minutes</span>
      </div>

      <div class="why-section" :class="{ expanded: showWhy }">
        <button type="button" class="why-toggle ghost" @click="showWhy = !showWhy">
          <span v-if="!showWhy">Why this works</span>
          <span v-else>Hide explanation</span>
        </button>
        <p v-if="showWhy" class="why-text fade-in">
          {{ moment.why_it_works }}
        </p>
      </div>

      <div class="actions">
        <button ref="doneButton" type="button" class="primary done-button" @click="completeMoment">
          Done for now ✓
        </button>
        <button type="button" class="secondary skip-button" @click="skipMoment">
          Skip →
        </button>
      </div>
    </div>

    <div class="content fade-in" v-else>
      <h2>Moment not found</h2>
      <p class="subtitle">This moment doesn't exist or may have been removed.</p>
      <NuxtLink to="/" class="primary">Back to home</NuxtLink>
    </div>
  </main>
</template>

<script setup lang="ts">
import { getMomentCopy } from '~/utils/selectMoment'
import type { Moment } from '~/types/moment'

const route = useRoute()
const router = useRouter()

const showWhy = ref(false)
const userStyle = ref<'direct' | 'reflective'>('direct')
const doneButtonRef = useTemplateRef('doneButton')

const momentId = route.params.id as string
const { data: moment } = await useAsyncData(
  `moment-${momentId}`,
  () => queryCollection('moments').where('stem', '=', `moments/${momentId}`).first()
)

const momentCopy = computed(() =>
  moment.value ? getMomentCopy(moment.value as Moment, userStyle.value) : ''
)

onMounted(async () => {
  const { prefs } = useDB()
  const userPrefs = await prefs.get()
  userStyle.value = userPrefs.style || 'direct'
})

const completeMoment = async (): Promise<void> => {
  if (!moment.value) return

  const { engagements, prefs } = useDB()

  await engagements.add({
    moment_id: momentId,
    gap_id: route.query.gap as string || 'manual',
    action: 'completed',
    timestamp: new Date().toISOString()
  })

  await prefs.resetDismissals()
  showSuccessAnimation()

  setTimeout(() => {
    router.push('/')
  }, 1500)
}

const skipMoment = async (): Promise<void> => {
  if (!moment.value) return

  const { engagements, prefs } = useDB()

  await engagements.add({
    moment_id: momentId,
    gap_id: route.query.gap as string || 'manual',
    action: 'skipped',
    timestamp: new Date().toISOString()
  })

  await prefs.incrementDismissals()
  router.push('/')
}

const showSuccessAnimation = (): void => {
  doneButtonRef.value?.classList.add('success')
}
</script>

<style scoped>
.moment-screen {
  background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
  container-type: inline-size;
}

.content {
  max-width: 600px;
  width: 90%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xl);
}

.moment-copy {
  text-align: center;
  padding: var(--spacing-2xl);
}

.moment-copy p {
  font-family: var(--font-body);
  font-size: var(--text-2xl);
  line-height: 1.6;
  color: var(--text);
  font-style: italic;
}

.duration-indicator {
  font-size: var(--text-sm);
  color: var(--text-muted);
  padding: var(--spacing-xs) var(--spacing-md);
  background: rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-full);
}

.why-section {
  text-align: center;
  max-width: 500px;
}

.why-toggle {
  font-size: var(--text-sm);
  color: var(--text-muted);
  text-decoration: underline;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: var(--spacing-sm);
  transition: color var(--transition-fast);
}

.why-toggle:hover {
  color: var(--text);
}

.why-text {
  margin-top: var(--spacing-md);
  font-size: var(--text-base);
  line-height: 1.5;
  color: var(--text-muted);
  font-family: var(--font-body);
}

.actions {
  display: flex;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-xl);
}

.done-button {
  background: var(--success);
  color: white;
  padding: var(--spacing-md) var(--spacing-xl);
}

.done-button:hover {
  background: color-mix(in srgb, var(--success) 90%, black);
}

.done-button.success {
  animation: successPulse 0.6s ease-out;
}

.skip-button {
  background: transparent;
  color: var(--text-muted);
  border: 2px solid var(--text-muted);
}

.skip-button:hover {
  background: var(--text);
  border-color: var(--text);
  color: var(--surface);
}

@keyframes successPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@container (max-width: 768px) {
  .moment-copy p {
    font-size: var(--text-xl);
  }

  .actions {
    flex-direction: column;
    width: 100%;
  }

  .actions button {
    width: 100%;
  }
}
</style>
