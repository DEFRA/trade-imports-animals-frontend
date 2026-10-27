import { documentUploadSessions } from '../../../../../../../services/cdp-uploader/index.js'
import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import {
  carriedCorrelationId,
  newCorrelationId,
  returnPath
} from '../contracts/upload-session.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../upload-config.js'

const openSession = async (request, journeyId) => {
  const correlationId = newCorrelationId()
  const { uploadId, uploadPath } = await documentUploadSessions.open({
    journeyId,
    correlationId,
    returnPath: returnPath(request, journeyId, correlationId),
    maxFileSize: MAX_FILE_SIZE_BYTES,
    mimeTypes: ALLOWED_MIME_TYPES
  })
  try {
    await documentUploads.register({ journeyId, uploadId, correlationId })
  } catch (err) {
    request.logger.error(
      { err, status: err.status, journeyId, uploadId, correlationId },
      'Could not record the upload session against the notification'
    )
    throw err
  }
  request.logger.info(
    { journeyId, uploadId, correlationId },
    'Upload session opened'
  )
  return { uploadPath, uploadSession: correlationId }
}

const sessionCarriedIn = async (request, journeyId) => {
  const correlationId = carriedCorrelationId(request)
  if (!correlationId) {
    return undefined
  }
  try {
    const registered = await documentUploads.findByCorrelationId({
      journeyId,
      correlationId
    })
    return registered
      ? {
          uploadPath: documentUploadSessions.uploadPathFor(registered.uploadId),
          uploadSession: correlationId
        }
      : undefined
  } catch (err) {
    request.logger.warn(
      { err, status: err.status, journeyId, correlationId },
      'Could not read the upload session this page already opened, opening another'
    )
    return undefined
  }
}

/**
 * The session the add-a-document form posts its file to: the one the page view being re-rendered
 * already opened, where the request carries its handle, and a newly opened one otherwise, recorded
 * against the notification so the scan result can be matched when it arrives.
 *
 * @param {object} request - the request the page is being rendered for
 * @param {string} journeyId - the notification the document belongs to
 * @returns {Promise<{uploadPath: string, uploadSession: string}>} where the form posts to, and the
 *   handle the next render of the page reuses the session by
 * @throws {Error} when no session is open already and one cannot be opened or recorded
 */
export const addFormSession = async (request, journeyId) =>
  (await sessionCarriedIn(request, journeyId)) ??
  openSession(request, journeyId)
