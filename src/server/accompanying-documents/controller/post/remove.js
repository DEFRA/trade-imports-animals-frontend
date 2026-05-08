import {
  getSessionValue,
  setSessionValue
} from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { documentClient } from '../../../common/clients/document-client.js'

const isOwnedBySession = (sessionDocuments, uploadId) =>
  sessionDocuments.some((doc) => doc.uploadId === uploadId)

const dropFromSession = (request, sessionDocuments, uploadId) =>
  setSessionValue(
    request,
    sessionKeys.documents,
    sessionDocuments.filter((doc) => doc.uploadId !== uploadId)
  )

export const removeDocument = async (request, h, uploadId, traceId) => {
  const sessionDocuments = getSessionValue(request, sessionKeys.documents) ?? []

  if (!isOwnedBySession(sessionDocuments, uploadId)) {
    request.logger.warn(
      `Remove rejected: uploadId=${uploadId} not found in session`
    )
    return h.response('Bad Request').code(statusCodes.badRequest)
  }

  try {
    await documentClient.delete(uploadId, traceId)
  } catch (err) {
    request.logger.error(
      `Failed to delete document from backend: ${err.message}`
    )
    return h.redirect('/accompanying-documents')
  }

  dropFromSession(request, sessionDocuments, uploadId)
  return h.redirect('/accompanying-documents')
}
