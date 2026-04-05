import { z } from 'zod'
import { auth } from '../../utils/auth'

type PushSubscriptionKeys = {
  p256dh: string
  auth: string
}

type StoredPushSubscription = {
  endpoint: string
  keys: PushSubscriptionKeys
}

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  })
})

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const headers = getHeaders(event)
  const session = await auth.api.getSession({ headers })

  if (!session?.session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const parseResult = bodySchema.safeParse(await readBody(event))

  if (!parseResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid push subscription' })
  }

  const userId = session.user.id
  const kvKey = `user:${userId}:push_subscription`

  const subscription: StoredPushSubscription = {
    endpoint: parseResult.data.endpoint,
    keys: parseResult.data.keys
  }

  await hubKV().set(kvKey, subscription)

  return { ok: true }
})
