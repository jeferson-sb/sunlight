<template>
  <main class="full-screen insight-screen">
    <div class="warm-overlay"></div>

    <div class="content fade-in">
      <header class="insight-header">
        <NuxtLink to="/" class="back-link ghost">
          ← Back
        </NuxtLink>
        <p class="label">Your week in one thought</p>
      </header>

      <div v-if="insight" class="insight-card">
        <p class="insight-text">{{ insight }}</p>
      </div>

      <div v-else class="empty-state">
        <div class="sun-icon" aria-hidden="true">
          <svg width="56" height="56" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="60" r="20" fill="var(--accent)" opacity="0.8"/>
            <path d="M20 60 Q40 20 60 60" stroke="var(--accent)" stroke-width="3" fill="none"/>
          </svg>
        </div>
        <p class="empty-message">Your weekly insight will appear here on Sunday evenings.</p>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
const insight = ref<string | null>(null)

onMounted(async () => {
  const { prefs } = useDB()
  const savedPrefs = await prefs.get()
  insight.value = savedPrefs.last_insight ?? null
})
</script>

<style scoped>
.insight-screen {
  background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
  container-type: inline-size;
}

.content {
  max-width: 600px;
  width: 90%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.insight-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.back-link {
  align-self: flex-start;
  font-family: var(--font-heading);
  font-size: var(--text-sm);
  color: var(--text-muted);
  transition: color var(--transition-fast);

  &:hover {
    color: var(--text);
    background: rgba(109, 104, 117, 0.1);
    border-radius: var(--radius-full);
  }
}

.label {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-family: var(--font-heading);
  font-weight: 600;
  margin-block-end: 0;
}

.insight-card {
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl);
  box-shadow: var(--shadow-md);
}

.insight-text {
  font-family: var(--font-body);
  font-size: var(--text-xl);
  line-height: 1.7;
  color: var(--text);
  font-style: italic;
  margin-block-end: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-lg);
  text-align: center;
  padding: var(--spacing-2xl);
}

.sun-icon {
  opacity: 0.7;
}

.empty-message {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 30ch;
  margin-block-end: 0;
}

@container (max-width: 480px) {
  .insight-text {
    font-size: var(--text-lg);
  }
}
</style>
