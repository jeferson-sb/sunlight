import { z } from 'zod'
import { calendar_v3 } from '@googleapis/calendar'
import { GoogleAPIClient } from '../../utils/google-api-client'
import { auth } from '../../utils/auth'

const querySchema = z.object({
  timeMin: z.string().optional(),
  timeMax: z.string().optional()
})

type CalendarEventsResponse = {
  items: calendar_v3.Schema$Event[]
}

type GoogleAPIError = {
  response?: { status?: number }
  statusCode?: number
  status?: number
}

const extractStatus = (error: unknown): number | undefined => {
  if (!(error instanceof Object)) return undefined
  const e = error as GoogleAPIError
  return e.response?.status ?? e.statusCode ?? e.status
}

export default defineEventHandler(async (event): Promise<CalendarEventsResponse> => {
  const headers = getHeaders(event)
  const session = await auth.api.getSession({ headers })

  if (!session?.session) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // Access token is stored in the account table, not the session
  const db = hubDatabase()
  const account = await db
    .prepare('SELECT accessToken, refreshToken FROM account WHERE userId = ? AND providerId = ?')
    .bind(session.user.id, 'google')
    .first<{ accessToken: string | null; refreshToken: string | null }>()

  if (!account?.accessToken) {
    throw createError({ statusCode: 401, statusMessage: 'No access token available' })
  }

  const accessToken = account.accessToken

  const parseResult = querySchema.safeParse(getQuery(event))

  if (!parseResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid query parameters' })
  }

  const { timeMin, timeMax } = parseResult.data

  try {
    const authClient = new GoogleAPIClient(accessToken, account.refreshToken ?? undefined)
    const calendarClient = new calendar_v3.Calendar({ auth: authClient })

    const response = await calendarClient.events.list({
      calendarId: 'primary',
      timeMin: timeMin ?? new Date().toISOString(),
      timeMax: timeMax ?? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    })

    return { items: response.data.items ?? [] }
  } catch (error: unknown) {
    const status = extractStatus(error)
    const message = error instanceof Error ? error.message : 'Failed to fetch calendar events'

    if (status === 401) {
      throw createError({ statusCode: 401, statusMessage: 'Authentication required. Please sign in again.' })
    }

    if (status === 403) {
      throw createError({ statusCode: 403, statusMessage: 'Calendar access not granted' })
    }

    throw createError({ statusCode: status ?? 500, statusMessage: message })
  }
})