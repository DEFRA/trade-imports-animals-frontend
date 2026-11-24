import { HTTP_STATUS_NOT_FOUND } from '../../lib/http-status.js'
import { backendBaseUrl } from '../persistence/records/real/config.js'
import {
  refuseUnlessOk,
  requestBackend,
  send
} from '../persistence/records/real/http/send.js'

const rejectionReasonOf = (files) =>
  (Array.isArray(files) ? files : []).find((file) => file.hasError)?.errorCode

export const documentUploads = {
  register: async ({ journeyId, uploadId, correlationId }) => {
    await send(
      'register-document-upload',
      `${backendBaseUrl}/notifications/${encodeURIComponent(journeyId)}/document-uploads`,
      { method: 'POST', body: { uploadId, correlationId } },
      { journeyId, uploadId }
    )
  },

  claim: async ({ uploadId, documentType, documentReference, dateOfIssue }) => {
    await send(
      'claim-document-upload',
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}/claim`,
      {
        method: 'POST',
        body: { documentType, documentReference, dateOfIssue }
      },
      { uploadId }
    )
  },

  findByCorrelationId: async ({ journeyId, correlationId }) => {
    const operation = 'get-document-upload-session'
    const response = await requestBackend(
      operation,
      `${backendBaseUrl}/notifications/${encodeURIComponent(journeyId)}/document-upload-sessions/${encodeURIComponent(correlationId)}`,
      { method: 'GET' }
    )
    if (response.status === HTTP_STATUS_NOT_FOUND) {
      return undefined
    }
    return (
      await refuseUnlessOk(operation, response, { journeyId, correlationId })
    ).json()
  },

  listByNotification: async ({ journeyId }) => {
    const response = await send(
      'list-document-uploads',
      `${backendBaseUrl}/notifications/${encodeURIComponent(journeyId)}/document-uploads`,
      { method: 'GET' },
      { journeyId }
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
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}`,
      { method: 'GET' },
      { uploadId }
    )
    const { scanStatus, files } = await response.json()
    return { scanStatus, rejectionReason: rejectionReasonOf(files) }
  },

  remove: async (uploadId) => {
    await send(
      'delete-document-upload',
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}`,
      { method: 'DELETE' },
      { uploadId }
    )
  },

  streamFile: async (uploadId) =>
    send(
      'stream-document-file',
      `${backendBaseUrl}/document-uploads/${encodeURIComponent(uploadId)}/file`,
      { method: 'GET' },
      { uploadId }
    )
}
