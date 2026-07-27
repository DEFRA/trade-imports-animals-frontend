import { randomUUID } from 'node:crypto'
import { getTraceId } from '@defra/hapi-tracing'
import { getSessionValue } from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { cdpUploaderClient } from '../../common/clients/cdp-uploader-client.js'
import { documentClient } from '../../common/clients/document-client.js'
import { config } from '../../../config/config.js'
import { buildPageModel, getAttempt } from './page-model.js'

// EUDPA-106 Option 3-with-callbacks: initiate a cdp-uploader session on every
// GET. Pass the backend callback URL and metadata { correlationId,
// notificationReferenceNumber } so cdp-uploader can create the backend record
// itself on scan completion. Non-file form fields the browser submits alongside
// the file (documentType, documentReference, issueDate-*) come back in the
// callback body under form.* — the backend reads them from there rather than
// requiring them at /initiate time.
const initiateCdpUploaderSession = async (referenceNumber, logger) => {
  const correlationId = randomUUID()
  // Thread the correlationId onto the redirect URL so /upload-successful can
  // filter the backend list to this specific upload — multi-tab safe (each tab
  // mints its own correlationId). Query-string is URL-safe: correlationId is
  // a UUIDv4 (hex + hyphens, no encoding needed).
  const redirect = `${config.get('cdpUploader.redirectPath')}?corr=${correlationId}`
  return cdpUploaderClient
    .initiate({
      redirect,
      callback: config.get('cdpUploader.callbackUrl'),
      s3Bucket: config.get('cdpUploader.documentsBucket'),
      maxFileSize: config.get('cdpUploader.maxFileSize'),
      mimeTypes: config.get('cdpUploader.mimeTypes').split(','),
      metadata: {
        correlationId,
        notificationReferenceNumber: referenceNumber
      }
    })
    .then((result) => {
      logger.info(
        { uploadId: result?.uploadId, correlationId },
        'cdp-uploader /initiate ok'
      )
      return result
    })
    .catch((err) => {
      logger.warn(`cdp-uploader /initiate failed: ${err.message}`)
      return null
    })
}

// EUDPA-106 Option 3-with-callbacks: docs list is now sourced from the backend
// (which owns the source-of-truth via cdp-uploader's scan-result callback).
// The response returns each doc with its current scanStatus already populated,
// so no further per-doc refresh call is needed — the list *is* the current
// state as of this request. Flatten the DTO shape to what the view template
// expects (filename lifted out of the files[] array; drop the fields the docs
// list doesn't render).
const flattenDocumentDto = (item) => ({
  uploadId: item.uploadId,
  filename: item.files?.[0]?.filename ?? 'upload',
  documentType: item.documentType,
  documentReference: item.documentReference,
  dateOfIssue: item.dateOfIssue,
  scanStatus: item.scanStatus
})

const listDocuments = async (referenceNumber, traceId, logger) => {
  if (!referenceNumber) {
    return []
  }
  try {
    const response = await documentClient.list(referenceNumber, traceId)
    return (response.items ?? []).map(flattenDocumentDto)
  } catch (err) {
    logger.warn(
      `Failed to list documents for notification ${referenceNumber}: ${err.message}`
    )
    return []
  }
}

export const getHandler = async (request, h) => {
  const traceId = getTraceId() ?? ''
  const attempt = getAttempt(request)
  const referenceNumber = getSessionValue(request, sessionKeys.referenceNumber)

  const [documents, cdpUploaderSession] = await Promise.all([
    listDocuments(referenceNumber, traceId, request.logger),
    initiateCdpUploaderSession(referenceNumber, request.logger)
  ])

  return h.view(
    'accompanying-documents/index',
    buildPageModel(documents, attempt, {
      referenceNumber,
      cdpUploaderSession
    })
  )
}
