import { documentUploads } from '../../../../../../../services/document-uploads/index.js'

const listedBy = (documents, uploadId) =>
  documents.some(({ entry: document }) => document.uploadId === uploadId)

/**
 * An upload the service has taken on that this notification does not list, so the page can
 * recover it rather than carry the journey on without it. The two part company when a claim
 * succeeds and the save of the document that follows it does not.
 *
 * @param {object} request - the request being handled
 * @param {object} pageState - the loaded page state
 * @returns {Promise<{uploadId?: string, correlationId?: string, unchecked?: boolean}>} the upload
 *   and the handle to recover it by; `{}` when the notification lists every upload taken on;
 *   `{unchecked: true}` when the service could not be asked
 */
export const unsavedClaimedUpload = async (request, pageState) => {
  const journeyId = pageState.journey.journeyId
  try {
    const uploads = await documentUploads.listByNotification({ journeyId })
    const unsaved = uploads.find(
      (upload) =>
        upload.claimed && !listedBy(pageState.documents, upload.uploadId)
    )
    return unsaved
      ? { uploadId: unsaved.uploadId, correlationId: unsaved.correlationId }
      : {}
  } catch (err) {
    request.logger.error(
      { err, status: err.status, journeyId },
      'Could not read the documents the service has taken on for this notification'
    )
    return { unchecked: true }
  }
}
