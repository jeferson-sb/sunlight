<template>
  <main class="full-screen onboarding-screen">
    <div class="warm-overlay"></div>

    <div class="content fade-in">
      <div class="logo mb-xl">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="40" cy="60" r="20" fill="var(--accent)" opacity="0.8"/>
          <path d="M20 60 Q40 20 60 60" stroke="var(--accent)" stroke-width="3" fill="none"/>
        </svg>
      </div>

      <h1 class="mb-lg">Welcome to Sunlight</h1>

      <p class="tagline mb-xl">
        <em>Sunlight finds the quiet moments in your busy day.</em>
      </p>

      <button type="button" @click="connectGoogle" :disabled="loading" class="google-button">
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        {{ loading ? 'Connecting...' : 'Connect Google Calendar' }}
      </button>

      <p v-if="error" class="error-message mt-md">{{ error }}</p>

      <p class="privacy-note mt-lg">
        Your calendar data stays on your device.<br>
        We only store your account identity.
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
const { signInWithGoogle } = useAuth()

const loading = ref(false)
const error = ref('')

const connectGoogle = async () => {
  loading.value = true
  error.value = ''

  try {
    await signInWithGoogle()
  } catch (e) {
    error.value = 'Could not connect to Google. Please try again.'
  } finally {
    loading.value = false
  }
}
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

.logo {
  display: flex;
  justify-content: center;
}

h1 {
  font-size: var(--text-3xl);
  color: var(--text);
}

.tagline {
  font-size: var(--text-lg);
  color: var(--text-muted);
  font-family: var(--font-body);
}

.google-button {
  background: white;
  color: #3c4043;
  border: 1px solid #dadce0;
  padding: var(--spacing-md) var(--spacing-xl);
  font-family: var(--font-heading);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-md);
  border-radius: var(--radius-full);
  font-size: var(--text-base);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.google-button:hover {
  box-shadow: var(--shadow-md);
  border-color: #d2d3d4;
  background: #f8f9fa;
}

.google-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  font-size: var(--text-sm);
  color: #c0392b;
  line-height: 1.4;
}

.privacy-note {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: 1.4;
}
</style>
