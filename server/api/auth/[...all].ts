import { auth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Get the full URL for the request
  const url = getRequestURL(event)

  // Create a Web Request from the Nuxt event
  const request = new Request(url, {
    method: event.method,
    headers: getHeaders(event),
    body: event.method !== 'GET' && event.method !== 'HEAD'
      ? await readRawBody(event)
      : undefined,
  })

  // Handle the auth request
  const response = await auth.handler(request)

  // Set response headers
  response.headers.forEach((value, key) => {
    setHeader(event, key, value)
  })

  // Set response status
  if (response.status) {
    setResponseStatus(event, response.status)
  }

  // Return response body
  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return await response.json()
  }

  return await response.text()
})