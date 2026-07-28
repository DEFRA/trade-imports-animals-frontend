import { getSessionValue } from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { statusCodes } from '../../../common/constants/status-codes.js'
import { documentClient } from '../../../common/clients/document-client.js'

// EUDPA-106: under the direct-to-uploader flow the docs list is sourced from
// the backend on every render — yar's sessionKeys.documents is no longer
// populated. Ownership is "does the notification currently in this session
// own this uploadId?", hit against the backend list. Fails closed on any
// error. Same shape as the download handler's isOwnedByNotification.
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
      `Remove ownership check: backend list failed for ${referenceNumber}: ${err.message}`
    )
    return false
  }
}

export const removeDocument = async (request, h, uploadId, traceId) => {
  if (!(await isOwnedByNotification(request, uploadId, traceId))) {
    request.logger.warn(
      `Remove rejected: uploadId=${uploadId} not owned by session notification`
    )
    return h.response('Bad Request').code(statusCodes.badRequest)
  }

  try {
    await documentClient.delete(uploadId, traceId)
  } catch (err) {
    request.logger.error(
      `Failed to delete document from backend: ${err.message}`
    )
  }
  return h.redirect('/accompanying-documents')
}
