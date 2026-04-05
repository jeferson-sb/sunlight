import { queryCollection } from '@nuxt/content/server'
import type { Moment } from '../../app/types/moment'

export default defineEventHandler(async (event): Promise<Moment[]> => {
  const results = await queryCollection(event, 'moments').all()

  return results.map(({ stem, ...fields }) => ({
    ...fields,
    // Nuxt Content overwrites `id` with the file path; restore it from `stem` (e.g. "moments/breath-1" → "breath-1")
    id: stem.split('/').at(-1) ?? stem,
  })) as Moment[]
})
