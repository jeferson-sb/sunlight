<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { Moment } from '~/composables/useDB'

// Set up SEO defaults
useHead({
  title: 'Sunlight',
  meta: [
    { name: 'description', content: 'A micro-wellness companion that finds quiet moments in your busy day.' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'theme-color', content: '#FFCDB2' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})

// Fetch moments from content collection (runs on server + client)
const { data: momentsData } = await useAsyncData('moments-library', () =>
  queryCollection('moments').all()
)

// Populate IndexedDB on client only
if (import.meta.client) {
  const { moments } = useDB()

  watch(momentsData, async (data) => {
    if (!data?.length) return
    const existing = await moments.getAll()
    if (existing.length === 0) {
      await moments.bulkAdd(data as Moment[])
    }
  }, { immediate: true })
}
</script>
