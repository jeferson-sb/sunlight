<template>
  <div class="full-screen onboarding-screen">
    <div class="warm-overlay"></div>

    <div class="content fade-in">
      <div class="check-icon mb-lg pulse">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="40" r="35" stroke="var(--success)" stroke-width="3" opacity="0.3"/>
          <path d="M25 40 L35 50 L55 30" stroke="var(--success)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>

      <h1 class="mb-md">That's everything.</h1>

      <p class="message mb-lg">
        <em>We'll take it from here.</em>
      </p>

      <p class="description mb-xl">
        When you have a gap between meetings,<br>
        we'll let you know.
      </p>

      <div class="loading-indicator">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()

// Auto-redirect to main screen after 3 seconds
onMounted(() => {
  setTimeout(() => {
    router.push('/')
  }, 3000)
})
</script>

<style scoped>
.onboarding-screen {
  background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
}

.content {
  max-width: 400px;
  text-align: center;
  z-index: 2;
}

.check-icon {
  display: flex;
  justify-content: center;
}

h1 {
  font-size: var(--text-3xl);
  color: var(--text);
}

.message {
  font-size: var(--text-xl);
  color: var(--accent);
  font-family: var(--font-body);
}

.description {
  font-size: var(--text-base);
  color: var(--text-muted);
  line-height: 1.6;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-2xl);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: bounce 1.4s infinite ease-in-out;
}

.dot:nth-child(1) {
  animation-delay: -0.32s;
}

.dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>