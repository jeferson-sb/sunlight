import { defineContentConfig, defineCollection } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'data',
      source: '**/*.json',
      schema: z.object({
        id: z.string(),
        type: z.string(),
        copy: z.object({
          direct: z.string(),
          reflective: z.string()
        }),
        why_it_works: z.string(),
        min_duration: z.number(),
        max_duration: z.number(),
        available_from_week: z.number(),
        tags: z.array(z.string())
      }),
    })
  }
})
