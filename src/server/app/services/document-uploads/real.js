import { getTraceId } from '@defra/hapi-tracing'
import { createLogger } from '../../../common/helpers/logging/logger.js'

const logger = createLogger()

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'
const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'
const HTTP_STATUS_NOT_FOUND = 404

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

const initiate = async ({
  journeyId,
  documentType,
  documentReference,
  dateOfIssue,
  maxFileSize,
  mimeTypes
}) => {
  const response = await fetch(
    `${backendBaseUrl}/notifications/${journeyId}/document-uploads`,
    {
      method: 'POST',
      headers: traceHeaders('application/json'),
      body: JSON.stringify({
        documentType,
        documentReference,
        dateOfIssue,
        maxFileSize,
        mimeTypes
      })
    }
  )
  if (!response.ok) throw failed('initiate document upload', response)
  return response.json()
}

const uploadFile = async (uploadId, { filename, contentType, bytes }) => {
  const formData = new FormData()
  formData.append(
    'file',
    new Blob([bytes], { type: contentType ?? 'application/octet-stream' }),
    filename ?? 'upload'
  )
  const response = await fetch(
    `${backendBaseUrl}/document-uploads/${uploadId}/file`,
    {
      method: 'POST',
      headers: traceHeaders(),
      body: formData
    }
  )
  if (!response.ok) throw failed('upload document file', response)
}

const deleteUpload = async (uploadId) => {
  const response = await fetch(
    `${backendBaseUrl}/document-uploads/${uploadId}`,
    {
      method: 'DELETE',
      headers: traceHeaders()
    }
  )
  if (response.status === HTTP_STATUS_NOT_FOUND) return
  if (!response.ok) throw failed('delete document upload', response)
}

// A failed file leg leaves an initiated session with nothing in it. Deleting it
// is best-effort: a cleanup failure must never replace the error the user needs.
const discardUpload = async (uploadId) => {
  try {
    await deleteUpload(uploadId)
  } catch (err) {
    logger.warn(
      { err, uploadId },
      'Failed to discard orphaned document upload session'
    )
  }
}

const readSession = async (uploadId) => {
  const response = await fetch(
    `${backendBaseUrl}/document-uploads/${uploadId}`,
    { method: 'GET', headers: traceHeaders() }
  )
  if (!response.ok) throw failed('get document upload status', response)
  return response.json()
}

export const documentUploads = {
  upload: async (details) => {
    const { uploadId } = await initiate(details)
    try {
      await uploadFile(uploadId, details)
    } catch (error) {
      await discardUpload(uploadId)
      throw error
    }
    return uploadId
  },

  scanStatus: async ({ uploadId }) => (await readSession(uploadId)).scanStatus,

  // The notification a session belongs to, read from the same session the scan
  // status comes from — a retry can prove ownership without a second endpoint.
  ownerOf: async (uploadId) =>
    (await readSession(uploadId)).notificationReferenceNumber,

  remove: deleteUpload,

  streamFile: async (uploadId) => {
    const response = await fetch(
      `${backendBaseUrl}/document-uploads/${uploadId}/file`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) throw failed('stream document file', response)
    return response
  }
}
