import { z } from 'zod'
import { auth } from '../../utils/auth'

type ServerPrefs = {
  style?: 'direct' | 'reflective'
  week_number?: number
}

const bodySchema = z.object({
  style: z.enum(['direct', 'reflective']).optional(),
  week_number: z.number().int().positive().optional()
})

export default defineEventHandler(async (event): Promise<ServerPrefs> => {
  const headers = getHeaders(event)
  const session = await auth.api.getSession({ headers })

  if (!session?.session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const parseResult = bodySchema.safeParse(await readBody(event))

  if (!parseResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }

  const userId = session.user.id
  const kvKey = `user:${userId}:preferences`

  const existing = await hubKV().get<ServerPrefs>(kvKey) ?? {}
  const updated: ServerPrefs = { ...existing, ...parseResult.data }

  await hubKV().set(kvKey, updated)

  return updated
})
