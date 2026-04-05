import { auth } from '../../utils/auth'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const headers = getHeaders(event)
  const session = await auth.api.getSession({ headers })

  if (!session?.session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = session.user.id
  const kvKey = `user:${userId}:push_subscription`

  await hubKV().del(kvKey)

  return { ok: true }
})
