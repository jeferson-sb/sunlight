/**
 * Converts a base64url-encoded VAPID public key to the Uint8Array format
 * required by the browser's PushManager.subscribe() API.
 */
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

const PERMISSION_DECLINE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const usePush = () => {
  const config = useRuntimeConfig()
  const { prefs } = useDB()

  const permission = ref<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )
  const isSubscribed = ref(false)

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    isSubscribed.value = existing !== null
  }

  const requestAndSubscribe = async (): Promise<void> => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    const currentPrefs = await prefs.get()

    if (currentPrefs.permission_declined_at) {
      const declinedAt = new Date(currentPrefs.permission_declined_at).getTime()
      const cooldownExpired = Date.now() - declinedAt > PERMISSION_DECLINE_COOLDOWN_MS
      if (!cooldownExpired) return
    }

    const result = await Notification.requestPermission()
    permission.value = result

    if (result === 'denied') {
      await prefs.set({ permission_declined_at: new Date().toISOString() })
      return
    }

    if (result !== 'granted') return

    const registration = await navigator.serviceWorker.ready
    const applicationServerKey = urlBase64ToUint8Array(config.public.vapidPublicKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    })

    const { endpoint, keys } = subscription.toJSON() as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    await $fetch('/api/push/subscribe', {
      method: 'POST',
      body: { endpoint, keys }
    })

    isSubscribed.value = true
  }

  const unsubscribe = async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    await $fetch('/api/push/unsubscribe', { method: 'DELETE' })

    isSubscribed.value = false
  }

  onMounted(checkSubscription)

  return {
    permission,
    isSubscribed,
    requestAndSubscribe,
    unsubscribe
  }
}
