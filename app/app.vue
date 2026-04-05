<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  title: 'Sunlight',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  title: 'Sunlight',
  ogTitle: 'Sunlight',
  twitterTitle: 'Sunlight',
  ogUrl: 'https://sunlight.pages.dev',
  description: 'A micro-wellness companion that finds quiet moments in your busy day.',
  ogDescription: 'A micro-wellness companion that finds quiet moments in your busy day.',
  twitterDescription: 'A micro-wellness companion that finds quiet moments in your busy day.',
  twitterCard: 'summary_large_image',
  themeColor: '#FFCDB2',
})
</script>
