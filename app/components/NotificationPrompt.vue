<template>
  <Teleport to="body">
    <Transition name="prompt">
      <div v-if="visible" class="prompt-backdrop" @click="handleNotNow" aria-modal="true" role="dialog" aria-labelledby="prompt-heading">
        <section class="prompt-sheet" @click.stop>
          <p v-if="gap" class="prompt-context">
            You have {{ gap.duration_minutes }} minutes before your next meeting.
          </p>

          <h2 id="prompt-heading" class="prompt-heading">
            Can Sunlight send you a nudge next time?
          </h2>

          <p class="prompt-body">
            It'll only happen when you have a real gap.
          </p>

          <div class="prompt-actions">
            <button type="button" class="allow-btn" @click="handleAllow" :disabled="isLoading">
              {{ isLoading ? 'Setting up…' : 'Allow' }}
            </button>
            <button type="button" class="ghost" @click="handleNotNow">
              Not now
            </button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { DetectedGap } from '~/utils/detectGaps'

const props = defineProps<{
  gap: DetectedGap | null
}>()

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)
const isLoading = ref(false)

// Both usePush and useDB must only run on the client
const { requestAndSubscribe } = usePush()
const { prefs } = useDB()

const handleAllow = async () => {
  isLoading.value = true
  try {
    await requestAndSubscribe()
  } finally {
    isLoading.value = false
    emit('close')
  }
}

const handleNotNow = async () => {
  await prefs.set({ permission_declined_at: new Date().toISOString() })
  emit('close')
}
</script>

<style scoped>
.prompt-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(109, 104, 117, 0.4);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.prompt-sheet {
  background: var(--surface);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  padding: var(--spacing-xl) var(--spacing-lg);
  padding-block-end: calc(var(--spacing-xl) + env(safe-area-inset-bottom, 0px));
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-lg);

  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.prompt-context {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-family: var(--font-body);
  margin-block-end: var(--spacing-xs);
}

.prompt-heading {
  font-size: var(--text-xl);
  font-family: var(--font-heading);
  color: var(--text);
  line-height: var(--line-height-heading);
}

.prompt-body {
  font-size: var(--text-sm);
  color: var(--text-muted);
  font-family: var(--font-body);
  margin-block-end: var(--spacing-md);
}

.prompt-actions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-block-start: var(--spacing-md);
}

.allow-btn {
  width: 100%;
  padding-block: var(--spacing-sm);
  background: var(--text);
  color: var(--surface);
  border-radius: var(--radius-full);
  font-family: var(--font-heading);
  font-size: var(--text-base);
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--transition-base);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

/* Slide-up transition */
.prompt-enter-active,
.prompt-leave-active {
  transition: opacity var(--transition-base);

  & .prompt-sheet {
    transition: transform var(--transition-base);
  }
}

.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;

  & .prompt-sheet {
    transform: translateY(100%);
  }
}
</style>
