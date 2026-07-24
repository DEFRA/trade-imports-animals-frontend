import { config } from '../../../config/config.js'
import { createLogger } from '../helpers/logging/logger.js'

// EUDPA-106 spike: server-side client for the cdp-uploader /initiate + /status
// endpoints. The byte upload itself is browser → /upload-and-scan (proxied by
// the CDP nginx sidecar to cdp-uploader) — this client only handles the
// out-of-band session setup and scan-status polling.

const cdpUploaderBaseUrl = config.get('cdpUploader.baseUrl')
const logger = createLogger()

const request = async (path, { method, body, errorMessage }) => {
  const headers = {}
  const fetchOptions = { method, headers }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    fetchOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`${cdpUploaderBaseUrl}${path}`, fetchOptions)

  if (!response.ok) {
    const error = new Error(errorMessage)
    error.status = response.status
    error.statusText = response.statusText
    logger.error(`${errorMessage}: ${error.status} ${error.statusText}`)
    throw error
  }

  return response
}

export const cdpUploaderClient = {
  async initiate(payload) {
    const response = await request('/initiate', {
      method: 'POST',
      body: payload,
      errorMessage: 'Failed to initiate cdp-uploader upload'
    })
    return response.json()
  },

  // statusUrl comes back from /initiate absolute against cdp-uploader's own
  // host binding (e.g. http://localhost:7337/...) which reflects the URL the
  // browser would use. Server-side we're inside the docker network — swap
  // the host for the configured cdpUploaderBaseUrl so the call actually lands.
  async getStatus(statusUrl) {
    const url = new URL(statusUrl)
    const rewritten = `${cdpUploaderBaseUrl}${url.pathname}${url.search}`
    const response = await fetch(rewritten)
    if (!response.ok) {
      const error = new Error('Failed to get cdp-uploader status')
      error.status = response.status
      error.statusText = response.statusText
      logger.error(
        `Failed to get cdp-uploader status: ${response.status} ${response.statusText}`
      )
      throw error
    }
    return response.json()
  }
}
