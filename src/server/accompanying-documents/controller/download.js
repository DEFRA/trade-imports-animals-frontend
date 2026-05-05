import { Readable } from 'node:stream'
import Joi from 'joi'
import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { documentClient } from '../../common/clients/document-client.js'
import { statusCodes } from '../../common/constants/status-codes.js'

const DEFAULT_CONTENT_TYPE = 'application/octet-stream'
const DEFAULT_CONTENT_DISPOSITION = 'attachment'

const ALLOWED_DOWNLOAD_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/msword',
  DEFAULT_CONTENT_TYPE
])

const resolveDownloadContentType = (headers) => {
  const rawContentType = headers.get('content-type') ?? DEFAULT_CONTENT_TYPE
  const mimeType = rawContentType.split(';')[0].trim().toLowerCase()
  return ALLOWED_DOWNLOAD_CONTENT_TYPES.has(mimeType)
    ? mimeType
    : DEFAULT_CONTENT_TYPE
}

export const download = {
  options: {
    validate: {
      params: Joi.object({
        uploadId: Joi.string()
          .pattern(/^[a-zA-Z0-9-]+$/)
          .required()
      })
    }
  },
  handler: async (request, h) => {
    const traceId = getTraceId() ?? ''
    const { uploadId } = request.params

    const sessionDocuments =
      getSessionValue(request, sessionKeys.documents) ?? []
    const ownedBySession = sessionDocuments.some(
      (doc) => doc.uploadId === uploadId
    )
    if (!ownedBySession) {
      request.logger.warn(
        `Download rejected: uploadId=${uploadId} not found in session`
      )
      return h.response('Not Found').code(statusCodes.notFound)
    }

    const backendResponse = await documentClient.streamFile(uploadId, traceId)

    const contentType = resolveDownloadContentType(backendResponse.headers)
    const contentDisposition =
      backendResponse.headers.get('content-disposition') ??
      DEFAULT_CONTENT_DISPOSITION

    const nodeStream = Readable.fromWeb(backendResponse.body)

    return h
      .response(nodeStream)
      .header('Content-Type', contentType)
      .header('Content-Disposition', contentDisposition)
      .header('X-Content-Type-Options', 'nosniff')
  }
}
