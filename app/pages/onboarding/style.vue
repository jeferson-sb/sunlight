<template>
  <main class="full-screen onboarding-screen">
    <div class="warm-overlay"></div>

    <div class="content fade-in">
      <h2 class="mb-lg">How do you like to receive things?</h2>
      <p class="subtitle mb-xl">This helps us match your communication style.</p>

      <div class="style-cards">
        <div
          class="style-card direct-card"
          @click="selectStyle('direct')"
          :class="{ selected: selectedStyle === 'direct' }"
        >
          <h3>Just tell me what to do</h3>
          <p>Clear, direct guidance. Action-focused.</p>
          <div class="example">
            "Stand up. Roll your shoulders back. Take three deep breaths."
          </div>
        </div>

        <div
          class="style-card reflective-card"
          @click="selectStyle('reflective')"
          :class="{ selected: selectedStyle === 'reflective' }"
        >
          <h3>Help me understand why</h3>
          <p>Context and meaning. Reflection-focused.</p>
          <div class="example">
            "Your body has been holding this position for too long. Time to remind it there are other ways to be."
          </div>
        </div>
      </div>

      <p class="warning-message mt-md" v-if="error">{{ error }}</p>

      <p class="note mt-lg">
        You can change this anytime in settings.
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
const router = useRouter()
const selectedStyle = ref<'direct' | 'reflective' | null>(null)
const saving = ref(false)
const error = ref('')

const selectStyle = async (style: 'direct' | 'reflective') => {
  const { prefs } = useDB()

  if (saving.value) return

  saving.value = true
  error.value = ''
  selectedStyle.value = style

  // Save preference locally and mark onboarding as complete
  await prefs.set({ style })
  const onboardingComplete = useCookie('onboarding_complete')
  onboardingComplete.value = '1'

  // Also update server-side for persistence
  try {
    await $fetch('/api/user/preferences', {
      method: 'POST',
      body: { style }
    })
  } catch (e) {
    console.error('Failed to save preference to server:', e)
    error.value = "You might be offline or our servers weren't able to sync your preference. Try again later if disconnected."
  } finally {
    saving.value = false
    // Always navigate — local save succeeded, server sync is best-effort
    setTimeout(() => {
      router.push('/onboarding/done')
    }, 2000)
  }

}
</script>

<style scoped>
.onboarding-screen {
  background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
}

.content {
  max-width: 600px;
  text-align: center;
  z-index: 2;
}

h2 {
  font-size: var(--text-2xl);
  color: var(--text);
}

.subtitle {
  color: var(--text-muted);
  font-size: var(--text-base);
}

.style-cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.style-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  cursor: pointer;
  transition: all var(--transition-base);
  text-align: left;
  border: 3px solid transparent;
  position: relative;
  overflow: hidden;
}

.style-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  transition: all var(--transition-base);
}

.direct-card::before {
  background: var(--surface-2);
}

.reflective-card::before {
  background: var(--accent);
}

.style-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.style-card.selected {
  border-color: var(--text);
  transform: scale(1.02);
}

.style-card h3 {
  font-size: var(--text-xl);
  margin-bottom: var(--spacing-sm);
  color: var(--text);
}

.style-card p {
  color: var(--text-muted);
  margin-bottom: var(--spacing-md);
  font-size: var(--text-base);
}

.example {
  font-family: var(--font-body);
  font-style: italic;
  color: var(--text-muted);
  font-size: var(--text-sm);
  padding: var(--spacing-md);
  background: rgba(255, 235, 224, 0.5);
  border-radius: var(--radius-sm);
  margin-top: var(--spacing-md);
}

.warning-message {
  color: var(--yellow-9);
  font-size: var(--text-sm);
  background: var(--yellow-1);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-sm);
}

.note {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

@media (min-width: 768px) {
  .style-cards {
    flex-direction: row;
  }

  .style-card {
    flex: 1;
  }
}
</style>
