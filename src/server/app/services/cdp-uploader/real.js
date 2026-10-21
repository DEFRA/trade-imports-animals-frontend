import { getTraceId } from '@defra/hapi-tracing'
import { backendFetch } from '../../../common/helpers/call-counts/backend-fetch.js'

const uploaderBaseUrl =
  process.env.CDP_UPLOADER_BASE_URL ?? 'http://localhost:7337'
const scanResultCallbackUrl =
  process.env.CDP_UPLOADER_CALLBACK_URL ??
  'http://localhost:8085/document-uploads/pending/scan-results'
const documentsBucket =
  process.env.CDP_UPLOADER_DOCUMENTS_BUCKET ?? 'trade-imports-animals-documents'
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
   * @param {object} session - the session to open
   * @param {string} session.journeyId - the notification the document belongs to
   * @param {string} session.correlationId - the caller's own handle, returned on the scan callback
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
    const response = await backendFetch(`${uploaderBaseUrl}/initiate`, {
      method: 'POST',
      headers: traceHeaders('application/json'),
      body: JSON.stringify({
        redirect: returnPath,
        callback: scanResultCallbackUrl,
        s3Bucket: documentsBucket,
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
   * The status URL the session reports is addressed to the browser, so it resolves to this
   * container's own loopback when read from here. The path is rebuilt on the configured base URL.
   *
   * @param {string} uploadId - the session's id
   * @returns {Promise<{uploadStatus: string, form: object}>} the submitted form and its state
   */
  read: async (uploadId) => {
    const response = await backendFetch(
      `${uploaderBaseUrl}/status/${uploadId}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failed('read an upload session', response)
    }
    return response.json()
  }
}
