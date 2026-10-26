import { backendFetch } from '../../../common/helpers/call-counts/backend-fetch.js'
import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { failedResponse, traceHeaders } from '../http/trace-headers.js'

const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'

const rejectionReasonOf = (files) =>
  (Array.isArray(files) ? files : []).find((file) => file.hasError)?.errorCode

export const documentUploads = {
  register: async ({ journeyId, uploadId, correlationId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/notifications/${encodeURIComponent(journeyId)}/document-uploads`,
      {
        method: 'POST',
        headers: traceHeaders('application/json'),
        body: JSON.stringify({ uploadId, correlationId })
      }
    )
    if (!response.ok) {
      throw failedResponse('register document upload', response)
    }
  },

  claim: async ({ uploadId, documentType, documentReference, dateOfIssue }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}/claim`,
      {
        method: 'POST',
        headers: traceHeaders('application/json'),
        body: JSON.stringify({ documentType, documentReference, dateOfIssue })
      }
    )
    if (!response.ok) {
      throw failedResponse('claim document upload', response)
    }
  },

  findByCorrelationId: async ({ journeyId, correlationId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/notifications/${encodeURIComponent(journeyId)}/document-upload-sessions/${encodeURIComponent(correlationId)}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (response.status === HTTP_STATUS_NOT_FOUND) {
      return undefined
    }
    if (!response.ok) {
      throw failedResponse('get document upload session', response)
    }
    return response.json()
  },

  listByNotification: async ({ journeyId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/notifications/${encodeURIComponent(journeyId)}/document-uploads`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failedResponse('list document uploads', response)
    }
    const { items } = await response.json()
    return (items ?? []).map(({ uploadId, correlationId, claimed }) => ({
      uploadId,
      correlationId,
      claimed
    }))
  },

  scanStatus: async ({ uploadId }) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failedResponse('get document upload status', response)
    }
    const { scanStatus, files } = await response.json()
    return { scanStatus, rejectionReason: rejectionReasonOf(files) }
  },

  remove: async (uploadId) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}`,
      { method: 'DELETE', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failedResponse('delete document upload', response)
    }
  },

  streamFile: async (uploadId) => {
    const response = await backendFetch(
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}/file`,
      { method: 'GET', headers: traceHeaders() }
    )
    if (!response.ok) {
      throw failedResponse('stream document file', response)
    }
    return response
  }
}
