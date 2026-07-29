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

// EUDPA-106: under the direct-to-uploader flow the docs list is sourced from
// the backend on every render — yar's sessionKeys.documents is no longer
// populated. Ownership is now a "does the notification currently in this
// session own this uploadId?" check, hit against the backend list. Fails
// closed on any error.
const isOwnedByNotification = async (request, uploadId, traceId) => {
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)
  if (!referenceNumber) {
    return false
  }
  try {
    const response = await documentClient.list(referenceNumber, traceId)
    return (response.items ?? []).some((doc) => doc.uploadId === uploadId)
  } catch (err) {
    request.logger.warn(
      `Download ownership check: backend list failed for ${referenceNumber}: ${err.message}`
    )
    return false
  }
}

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
  async handler(request, h) {
    const { uploadId } = request.params
    const traceId = getTraceId() ?? ''

    if (!(await isOwnedByNotification(request, uploadId, traceId))) {
      request.logger.warn(
        `Download rejected: uploadId=${uploadId} not owned by session notification`
      )
      return h.response('Not Found').code(statusCodes.notFound)
    }

    const backendResponse = await documentClient.streamFile(uploadId, traceId)
    return respondWithFile(h, backendResponse)
  }
}
