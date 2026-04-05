import type {
  GaxiosOptions,
  GaxiosResponse,
  GaxiosPromise,
  OAuth2Client
} from 'googleapis-common'

/**
 * A minimal Google API auth client that uses Better Auth tokens
 * This bridges Better Auth's token management with Google API clients
 * Implements the minimal interface required by @googleapis/* packages
 */
export class GoogleAPIClient implements Pick<OAuth2Client, 'request'> {
  private accessToken: string
  private refreshToken?: string

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  /**
   * Make an authenticated request to Google APIs
   * Compatible with @googleapis/* packages
   */
async request<T = unknown>(opts: GaxiosOptions): GaxiosPromise<T> {
    // Build headers with authentication
    const headers: Record<string, string> = {
      ...opts.headers,
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }

    try {
      // Make the request using Nuxt's $fetch
      const response = await $fetch.raw<T>(opts.url!, {
        method: opts.method || 'GET',
        headers,
        params: opts.params,
        body: opts.data
      })

      // Return in the format expected by Google API clients
      const gaxiosResponse: GaxiosResponse<T> = {
        data: response._data!,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        config: opts,
        request: {}
      }

      return Promise.resolve(gaxiosResponse)
    } catch (error) {
      // Type guard for error handling
      if (error instanceof Error) {
        const fetchError = error as {
          status?: number
          statusCode?: number
          data?: unknown
          message: string
        }

        // Format error to match Google API client expectations
        const errorResponse = {
          response: {
            status: fetchError.status || fetchError.statusCode || 500,
            data: fetchError.data || fetchError.message
          },
          message: fetchError.message || 'Request failed',
          code: fetchError.status || fetchError.statusCode
        }

        throw errorResponse
      }

      // Fallback for unknown error types
      throw {
        response: {
          status: 500,
          data: 'Unknown error occurred'
        },
        message: 'Request failed',
        code: 500
      }
    }
  }

  /**
   * Update the access token (useful after refresh)
   */
  setAccessToken(token: string): void {
    this.accessToken = token
  }
}
