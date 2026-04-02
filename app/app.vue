<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
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

// Initialize moments library on first load
onMounted(async () => {
  const { moments } = useDB()

  // Check if moments are already loaded
  const existingMoments = await moments.getAll()

  if (existingMoments.length === 0) {
    // Load moments from JSON
    try {
      const response = await fetch('/moments.json')
      const momentsData = await response.json()
      await moments.bulkAdd(momentsData)
      console.log(`Loaded ${momentsData.length} moments into IndexedDB`)
    } catch (error) {
      console.error('Failed to load moments:', error)
    }
  }
})
</script>
