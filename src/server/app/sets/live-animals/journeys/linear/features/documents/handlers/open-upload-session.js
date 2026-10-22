import { documentUploadSessions } from '../../../../../../../services/cdp-uploader/index.js'
import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import { newCorrelationId, returnPath } from '../contracts/upload-session.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../upload-config.js'

/**
 * Opens the session the add-a-document form posts its file to, and records it against the
 * notification so the scan result can be matched when it arrives.
 *
 * @param {object} request - the request the page is being rendered for
 * @param {string} journeyId - the notification the document belongs to
 * @returns {Promise<{uploadPath: string}>} where the form posts to
 * @throws {Error} when the session cannot be opened or recorded
 */
export const openUploadSession = async (request, journeyId) => {
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
  return { uploadPath }
}
