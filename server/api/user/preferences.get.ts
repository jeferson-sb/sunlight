import { auth } from '../../utils/auth'

type ServerPrefs = {
  style?: 'direct' | 'reflective'
  week_number?: number
}

const DEFAULT_PREFS: ServerPrefs = {
  style: 'direct',
  week_number: 1
}

export default defineEventHandler(async (event): Promise<ServerPrefs> => {
  const headers = getHeaders(event)
  const session = await auth.api.getSession({ headers })

  if (!session?.session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = session.user.id
  const stored = await hubKV().get<ServerPrefs>(`user:${userId}:preferences`)

  return stored ?? DEFAULT_PREFS
})
