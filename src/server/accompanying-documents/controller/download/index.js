import { Readable } from 'node:stream'
import Joi from 'joi'
import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { documentClient } from '../../../common/clients/document-client.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import {
  resolveDownloadContentType,
  resolveContentDisposition
} from './content-type.js'

const isOwnedBySession = (request, uploadId) => {
  const sessionDocuments = getSessionValue(request, sessionKeys.documents) ?? []
  return sessionDocuments.some((doc) => doc.uploadId === uploadId)
}

const streamBackendFile = (uploadId, traceId) =>
  documentClient.streamFile(uploadId, traceId)

const respondWithFile = (h, backendResponse) =>
  h
    .response(Readable.fromWeb(backendResponse.body))
    .header('Content-Type', resolveDownloadContentType(backendResponse.headers))
    .header(
      'Content-Disposition',
      resolveContentDisposition(backendResponse.headers)
    )
    .header('X-Content-Type-Options', 'nosniff')

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
    const { uploadId } = request.params

    if (!isOwnedBySession(request, uploadId)) {
      request.logger.warn(
        `Download rejected: uploadId=${uploadId} not found in session`
      )
      return h.response('Not Found').code(statusCodes.notFound)
    }

    const backendResponse = await streamBackendFile(
      uploadId,
      getTraceId() ?? ''
    )
    return respondWithFile(h, backendResponse)
  }
}
