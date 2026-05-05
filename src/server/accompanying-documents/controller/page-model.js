import { documentClient } from '../../common/clients/document-client.js'
import {
  ALLOWED_FILE_TYPES_HINT,
  MAX_DOCUMENT_REFERENCE_LENGTH,
  DOCUMENT_TYPE_OPTIONS,
  getDocumentTypeLabel
} from '../document-upload-config.js'

export const MAX_POLLING_ATTEMPTS = 10

export const getAttempt = (request) => {
  const parsed = parseInt(request.query.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const getDocumentsWithStatus = async (documents, traceId, logger) =>
  Promise.all(
    documents.map(async (doc) => {
      try {
        const { scanStatus } = await documentClient.getStatus(
          doc.uploadId,
          traceId
        )
        return { ...doc, scanStatus }
      } catch (err) {
        logger.error(
          `Failed to get scan status for uploadId=${doc.uploadId}: ${err.message}`
        )
        return { ...doc, scanStatus: 'PENDING' }
      }
    })
  )

export const buildPageModel = (documentsWithStatus, attempt, extra = {}) => {
  const anyPending = documentsWithStatus.some(
    (doc) => doc.scanStatus === 'PENDING'
  )
  const anyRejected = documentsWithStatus.some(
    (doc) => doc.scanStatus === 'REJECTED'
  )
  const timedOut = anyPending && attempt >= MAX_POLLING_ATTEMPTS

  const rejectedErrors = documentsWithStatus
    .filter((doc) => doc.scanStatus === 'REJECTED')
    .map((doc) => ({
      href: '#documents-added',
      text: `${doc.filename} contains a virus. Remove it and try again with a different file.`
    }))

  const mergedErrors = [...rejectedErrors, ...(extra.errorList ?? [])]

  const documentsForView = documentsWithStatus.map((doc) => ({
    ...doc,
    documentTypeLabel: getDocumentTypeLabel(doc.documentType)
  }))

  return {
    pageTitle: 'Accompanying documents',
    documents: documentsForView,
    anyPending,
    timedOut,
    nextAttempt: attempt + 1,
    canContinue: !anyPending && !anyRejected,
    allowedFileTypesHint: ALLOWED_FILE_TYPES_HINT,
    maxDocumentReferenceLength: MAX_DOCUMENT_REFERENCE_LENGTH,
    documentTypeSelectItems: [
      { value: '', text: 'Select document type' },
      {
        text: '──────────',
        disabled: true,
        attributes: { 'aria-hidden': 'true' }
      },
      ...DOCUMENT_TYPE_OPTIONS
    ],
    ...extra,
    errorList: mergedErrors.length ? mergedErrors : null
  }
}
