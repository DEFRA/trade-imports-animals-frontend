import { backendFetch } from '../../../common/helpers/backend-client/backend-fetch.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { failedResponse } from '../http/trace-headers.js'
import { notificationBackendHeaders } from '../http/organisation-headers.js'

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'

const rejectionReasonOf = (files) =>
  (Array.isArray(files) ? files : []).find((file) => file.hasError)?.errorCode

const fetchDocumentUploads = (operation, path, { method, body }) =>
  backendFetch(operation, `${backendBaseUrl}${path}`, {
    method,
    headers: notificationBackendHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body)
  })

const send = async (operation, path, init) => {
  const response = await fetchDocumentUploads(operation, path, init)
  if (!response.ok) {
    throw failedResponse(operation, response)
  }
  return response
}

export const documentUploads = {
  register: async ({ journeyId, uploadId, correlationId }) => {
    await send(
      'register-document-upload',
      `/notifications/${encodeURIComponent(journeyId)}/document-uploads`,
      { method: 'POST', body: { uploadId, correlationId } }
    )
  },

  claim: async ({ uploadId, documentType, documentReference, dateOfIssue }) => {
    await send(
      'claim-document-upload',
      `/document-uploads/${encodeURIComponent(uploadId)}/claim`,
      {
        method: 'POST',
        body: { documentType, documentReference, dateOfIssue }
      }
    )
  },

  findByCorrelationId: async ({ journeyId, correlationId }) => {
    const operation = 'get-document-upload-session'
    const response = await fetchDocumentUploads(
      operation,
      `/notifications/${encodeURIComponent(journeyId)}/document-upload-sessions/${encodeURIComponent(correlationId)}`,
      { method: 'GET' }
    )
    if (response.status === HTTP_STATUS_NOT_FOUND) {
      return undefined
    }
    if (!response.ok) {
      throw failedResponse(operation, response)
    }
    return response.json()
  },

  listByNotification: async ({ journeyId }) => {
    const response = await send(
      'list-document-uploads',
      `/notifications/${encodeURIComponent(journeyId)}/document-uploads`,
      { method: 'GET' }
    )
    const { items } = await response.json()
    return (items ?? []).map(({ uploadId, correlationId, claimed }) => ({
      uploadId,
      correlationId,
      claimed
    }))
  },

  scanStatus: async ({ uploadId }) => {
    const response = await send(
      'get-document-upload-status',
      `/document-uploads/${encodeURIComponent(uploadId)}`,
      { method: 'GET' }
    )
    const { scanStatus, files } = await response.json()
    return { scanStatus, rejectionReason: rejectionReasonOf(files) }
  },

  remove: async (uploadId) => {
    await send(
      'delete-document-upload',
      `/document-uploads/${encodeURIComponent(uploadId)}`,
      { method: 'DELETE' }
    )
  },

  streamFile: async (uploadId) =>
    send(
      'stream-document-file',
      `/document-uploads/${encodeURIComponent(uploadId)}/file`,
      { method: 'GET' }
    )
}
