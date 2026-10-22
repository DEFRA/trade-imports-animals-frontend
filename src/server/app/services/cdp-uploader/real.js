import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../../../../config/config.js'
import { backendFetch } from '../../../common/helpers/call-counts/backend-fetch.js'

const uploaderBaseUrl = () => config.get('cdpUploader.baseUrl')
const scanResultCallbackUrl = () =>
  config.get('cdpUploader.scanResultCallbackUrl')
const documentsBucket = () => config.get('cdpUploader.documentsBucket')
const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

const failed = (action, response) => {
  const error = new Error(
    `Failed to ${action}: ${response.status} ${response.statusText}`
  )
  error.status = response.status
  error.statusText = response.statusText
  return error
}

const traceHeaders = (contentType) => ({
  ...(contentType ? { 'Content-Type': contentType } : {}),
  [tracingHeader]: getTraceId() ?? ''
})

export const documentUploadSessions = {
  /**
   * Opens an upload session for the browser to post a file to.
   *
   * @param {object} session
   * @param {string} session.journeyId - the notification the document belongs to
   * @param {string} session.correlationId - the handle this session is known by
   * @param {string} session.returnPath - a relative path to return the browser to
   * @param {number} session.maxFileSize - the largest file to accept, in bytes
   * @param {string[]} session.mimeTypes - the content types to accept
   * @returns {Promise<{uploadId: string, uploadPath: string}>} the session's id and where to post to
   */
  open: async ({
    journeyId,
    correlationId,
    returnPath,
    maxFileSize,
    mimeTypes
  }) => {
    const response = await backendFetch(`${uploaderBaseUrl()}/initiate`, {
      method: 'POST',
      headers: traceHeaders('application/json'),
      body: JSON.stringify({
        redirect: returnPath,
        callback: scanResultCallbackUrl(),
        s3Bucket: documentsBucket(),
        s3Path: journeyId,
        maxFileSize,
        mimeTypes,
        metadata: { correlationId, notificationReferenceNumber: journeyId }
      })
    })
    if (!response.ok) {
      throw failed('open an upload session', response)
    }
    const { uploadId } = await response.json()
    return { uploadId, uploadPath: `/upload-and-scan/${uploadId}` }
  },

  /**
   * Reads back what the browser submitted, including the text fields sent alongside the file.
   *
   * The path is built on the configured base URL rather than taken from the session.
   *
   * @param {string} uploadId - the session's id
   * @returns {Promise<{uploadStatus: string, form: object}>} the submitted form and its state
   */
  read: async (uploadId) => {
    const response = await backendFetch(
      `${uploaderBaseUrl()}/status/${uploadId}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failed('read an upload session', response)
    }
    return response.json()
  }
}
