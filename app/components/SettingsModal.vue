<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click="open = false">
      <div class="modal-content" @click.stop>
        <h2>Settings</h2>

        <div class="setting-item">
          <label for="preference">Communication Style</label>
          <select id="preference" v-model="prefs.style" @change="save('style', prefs.style)">
            <option value="direct">Direct - Just tell me what to do</option>
            <option value="reflective">Reflective - Help me understand why</option>
          </select>
        </div>

        <div class="setting-item">
          <label>Working Hours</label>
          <div class="time-inputs">
            <input
              type="time"
              id="working-hours-start"
              v-model="prefs.working_hours_start"
              @change="save('working_hours_start', prefs.working_hours_start)"
            />
            <span>to</span>
            <input
              type="time"
              id="working-hours-end"
              v-model="prefs.working_hours_end"
              @change="save('working_hours_end', prefs.working_hours_end)"
            />
          </div>
        </div>

        <div class="setting-item">
          <button class="secondary" @click="reconnectCalendar">
            Reconnect Google Calendar
          </button>
        </div>

        <button @click="open = false">Done</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const prefs = defineModel<{
  style: 'direct' | 'reflective'
  working_hours_start: string
  working_hours_end: string
}>('prefs', { required: true })

const save = (key: string, value: string) => {
  const { prefs: dbPrefs } = useDB()
  dbPrefs.set({ [key]: value })
}

const reconnectCalendar = () => {
  window.location.href = '/api/auth/google'
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-bottom: var(--spacing-lg);
}

.setting-item {
  margin-bottom: var(--spacing-lg);
}

.setting-item label {
  display: block;
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-xs);
}

.setting-item select,
.setting-item input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid #dadce0;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.time-inputs input {
  flex: 1;
}
</style>
