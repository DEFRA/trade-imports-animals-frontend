import { documentUploadSessions } from '../../../../../../../services/cdp-uploader/index.js'
import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import { newCorrelationId, returnPath } from '../contracts/upload-session.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../upload-config.js'

/**
 * Opens the session the add-a-document form posts its file to, and records it against the
 * notification so the scan result can be matched when it arrives.
 *
 * The form needs somewhere to post before the page is painted, because a trader without
 * JavaScript has no later moment to acquire one. A failure here leaves the rest of the page
 * readable: the caller renders the document list and refuses only the Add form.
 *
 * @param {object} request - the request being rendered
 * @param {string} journeyId - the notification the document belongs to
 * @returns {Promise<{uploadPath: string}>} where the form posts to
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
  await documentUploads.register({ journeyId, uploadId, correlationId })
  request.logger.info(
    { journeyId, uploadId, correlationId },
    'Upload session opened'
  )
  return { uploadPath }
}
