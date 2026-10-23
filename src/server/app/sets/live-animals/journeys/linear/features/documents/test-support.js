import { randomUUID } from 'node:crypto'

import { store } from '../../../../../../engine/store.js'
import {
  driveHandler,
  getHandlerEndingWith
} from '../../../../../../engine/test-support.js'
import { documentUploadSessions } from '../../../../../../services/cdp-uploader/index.js'
import { recordSubmittedUpload } from '../../../../../../services/cdp-uploader/stub.js'
import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import * as documents from './controller.js'
import { RETURNED_HANDLE_QUERY } from './contracts/upload-session.js'
import { documentsPage as page } from './page.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from './upload-config.js'

export const documentsPageHandler = getHandlerEndingWith(documents, page.slug)

export const addDocumentSubmission = (overrides = {}) => ({
  accompanyingDocumentReference: 'GBHC1234567890',
  accompanyingDocumentType: 'ITAHC',
  accompanyingDocumentDateOfIssue: '12/12/2025',
  file: {
    filename: 'itahc-certificate.pdf',
    headers: { 'content-type': 'application/pdf' },
    payload: Buffer.from('pdf-bytes')
  },
  ...overrides
})

/**
 * Opens an upload session against a notification, records what the add-a-document form submitted
 * to it and reports the handle the browser returns with.
 *
 * @param {object} upload - the upload to stand up
 * @param {string} upload.journeyId - the notification the upload belongs to
 * @param {object} upload.submission - the submitted fields, `file` as an annotated multipart entry
 * @returns {Promise<{correlationId: string, uploadId: string}>} the handle and the session it opened
 */
export const submitUploadForJourney = async ({ journeyId, submission }) => {
  const correlationId = randomUUID()
  const { uploadId } = await documentUploadSessions.open({
    journeyId,
    correlationId,
    maxFileSize: MAX_FILE_SIZE_BYTES,
    mimeTypes: ALLOWED_MIME_TYPES
  })
  await documentUploads.register({ journeyId, uploadId, correlationId })
  if (!recordSubmittedUpload(uploadId, submission)) {
    throw new Error(`No stand-in upload session to record against: ${uploadId}`)
  }
  return { correlationId, uploadId }
}

/**
 * Drives the documents page the way the upload service returns the browser to it: the submitted
 * form readable from the session it was posted to, and the correlation handle in the query.
 *
 * @param {object} [options] - `driveHandler` options, plus `submission` for what the form posted
 * @returns {Promise<object>} what `driveHandler` reports, plus the session's `uploadId`
 */
export const driveReturnFromUpload = async ({
  submission = addDocumentSubmission(),
  query = {},
  ...options
} = {}) => {
  const journey = await store.create()
  const { correlationId, uploadId } = await submitUploadForJourney({
    journeyId: journey.journeyId,
    submission
  })
  const result = await driveHandler(documentsPageHandler, {
    ...options,
    journeyId: journey.journeyId,
    query: { ...query, [RETURNED_HANDLE_QUERY]: correlationId }
  })
  return { ...result, uploadId }
}
