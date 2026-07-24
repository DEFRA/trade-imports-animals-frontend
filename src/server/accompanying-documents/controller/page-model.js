import { documentClient } from '../../common/clients/document-client.js'
import {
  ALLOWED_FILE_TYPES_HINT,
  MAX_DOCUMENT_REFERENCE_LENGTH,
  MAX_FILE_SIZE_LABEL,
  DOCUMENT_TYPE_OPTIONS,
  getDocumentTypeLabel
} from '../document-upload-config.js'

export const MAX_POLLING_ATTEMPTS = 10

export const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const fetchScanStatus = async (doc, traceId, logger) => {
  try {
    const { scanStatus } = await documentClient.getStatus(doc.uploadId, traceId)
    return { ...doc, scanStatus }
  } catch (err) {
    logger.error(
      `Failed to get scan status for uploadId=${doc.uploadId}: ${err.message}`
    )
    return { ...doc, scanStatus: 'PENDING' }
  }
}

export const getDocumentsWithStatus = (documents, traceId, logger) =>
  Promise.all(documents.map((doc) => fetchScanStatus(doc, traceId, logger)))

const computeStatusFlags = (docs, attempt) => {
  const anyPending = docs.some((doc) => doc.scanStatus === 'PENDING')
  const anyRejected = docs.some((doc) => doc.scanStatus === 'REJECTED')
  return {
    anyPending,
    anyRejected,
    timedOut: anyPending && attempt >= MAX_POLLING_ATTEMPTS
  }
}

const buildRejectedErrors = (docs) =>
  docs
    .filter((doc) => doc.scanStatus === 'REJECTED')
    .map((doc) => ({
      href: '#documents-added',
      text: `${doc.filename} contains a virus. Remove it and try again with a different file.`
    }))

const decorateDocumentsForView = (docs) =>
  docs.map((doc) => ({
    ...doc,
    documentTypeLabel: getDocumentTypeLabel(doc.documentType)
  }))

const buildDocumentTypeSelectItems = () => [
  { value: '', text: 'Select document type' },
  {
    text: '──────────',
    disabled: true,
    attributes: { 'aria-hidden': 'true' }
  },
  ...DOCUMENT_TYPE_OPTIONS
]

export const buildPageModel = (documentsWithStatus, attempt, extra = {}) => {
  const flags = computeStatusFlags(documentsWithStatus, attempt)
  const errorList = [
    ...buildRejectedErrors(documentsWithStatus),
    ...(extra.errorList ?? [])
  ]

  return {
    pageTitle: 'Accompanying documents',
    documents: decorateDocumentsForView(documentsWithStatus),
    anyPending: flags.anyPending,
    timedOut: flags.timedOut,
    nextAttempt: attempt + 1,
    canContinue: !flags.anyPending && !flags.anyRejected,
    allowedFileTypesHint: ALLOWED_FILE_TYPES_HINT,
    maxDocumentReferenceLength: MAX_DOCUMENT_REFERENCE_LENGTH,
    // EUDPA-106 fix 1 (Option A): maxFileSize + oversizeFileMessage removed
    // so the client-side preflight (accompanying-documents.js) bails on empty
    // data attributes. See workareas/shared/EUDPA-106/findings.md for the full
    // enforcement chain and the deferred cleanup.
    maxFileSizeLabel: MAX_FILE_SIZE_LABEL,
    documentTypeSelectItems: buildDocumentTypeSelectItems(),
    ...extra,
    errorList: errorList.length ? errorList : null
  }
}
