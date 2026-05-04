import { Readable } from 'node:stream'
import Joi from 'joi'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import {
  accompanyingDocumentsSchema,
  validatePartialDate
} from './accompanying-documents-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { documentClient } from '../common/clients/document-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../../config/config.js'
import {
  ALLOWED_TYPES,
  ALLOWED_FILE_TYPES_HINT,
  MAX_FILE_SIZE_BYTES,
  MAX_DOCUMENTS,
  MAX_DOCUMENT_REFERENCE_LENGTH,
  DOCUMENT_TYPE_OPTIONS,
  getDocumentTypeLabel
} from './document-upload-config.js'

const frontendBaseUrl = config.get('frontendBaseUrl')
export const MAX_POLLING_ATTEMPTS = 10

const ALLOWED_EXTENSIONS = new Set(ALLOWED_TYPES.map((type) => `.${type.ext}`))
const ALLOWED_MIME_TYPES = ALLOWED_TYPES.map((type) => type.mime)

const DEFAULT_CONTENT_TYPE = 'application/octet-stream'
const DEFAULT_CONTENT_DISPOSITION = 'attachment'

const ALLOWED_DOWNLOAD_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/msword',
  DEFAULT_CONTENT_TYPE
])

const resolveDownloadContentType = (headers) => {
  const rawContentType = headers.get('content-type') ?? DEFAULT_CONTENT_TYPE
  const mimeType = rawContentType.split(';')[0].trim().toLowerCase()
  return ALLOWED_DOWNLOAD_CONTENT_TYPES.has(mimeType)
    ? mimeType
    : DEFAULT_CONTENT_TYPE
}

const getAttempt = (request) => {
  const parsed = parseInt(request.query.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

const getDocumentsWithStatus = async (documents, traceId, logger) =>
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

const buildPageModel = (documentsWithStatus, attempt, extra = {}) => {
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

export const accompanyingDocumentsController = {
  status: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const rawDocuments = getSessionValue(request, sessionKeys.documents) ?? []
      const documentsWithStatus = await getDocumentsWithStatus(
        rawDocuments,
        traceId,
        request.logger
      )
      return h.response({ documents: documentsWithStatus }).code(200)
    }
  },
  get: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const attempt = getAttempt(request)
      const rawDocuments = getSessionValue(request, sessionKeys.documents) ?? []
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )

      const documentsWithStatus = await getDocumentsWithStatus(
        rawDocuments,
        traceId,
        request.logger
      )

      return h.view(
        'accompanying-documents/index',
        buildPageModel(documentsWithStatus, attempt, { referenceNumber })
      )
    }
  },
  download: {
    options: {
      validate: {
        params: Joi.object({
          uploadId: Joi.string()
            .pattern(/^[a-zA-Z0-9-]+$/)
            .required()
        })
      }
    },
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const { uploadId } = request.params

      const sessionDocuments =
        getSessionValue(request, sessionKeys.documents) ?? []
      const ownedBySession = sessionDocuments.some(
        (doc) => doc.uploadId === uploadId
      )
      if (!ownedBySession) {
        request.logger.warn(
          `Download rejected: uploadId=${uploadId} not found in session`
        )
        return h.response('Not Found').code(statusCodes.notFound)
      }

      const backendResponse = await documentClient.streamFile(uploadId, traceId)

      const contentType = resolveDownloadContentType(backendResponse.headers)
      const contentDisposition =
        backendResponse.headers.get('content-disposition') ??
        DEFAULT_CONTENT_DISPOSITION

      const nodeStream = Readable.fromWeb(backendResponse.body)

      return h
        .response(nodeStream)
        .header('Content-Type', contentType)
        .header('Content-Disposition', contentDisposition)
        .header('X-Content-Type-Options', 'nosniff')
    }
  },
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const { _action } = request.payload

      if (_action?.startsWith('remove-')) {
        const uploadId = _action.slice('remove-'.length)
        const sessionDocuments =
          getSessionValue(request, sessionKeys.documents) ?? []
        const ownedBySession = sessionDocuments.some(
          (doc) => doc.uploadId === uploadId
        )
        if (!ownedBySession) {
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
        setSessionValue(
          request,
          sessionKeys.documents,
          sessionDocuments.filter((doc) => doc.uploadId !== uploadId)
        )
        return h.redirect('/accompanying-documents')
      }

      const {
        'issueDate-day': issueDateDay,
        'issueDate-month': issueDateMonth,
        'issueDate-year': issueDateYear,
        documentType,
        documentReference,
        crumb,
        file: fileData
      } = request.payload

      // Hoisted so all error branches below can reuse the same values
      // without re-parsing the attempt query param or re-fetching documents.
      const attempt = getAttempt(request)
      const documents = getSessionValue(request, sessionKeys.documents) ?? []
      const documentsWithStatus = await getDocumentsWithStatus(
        documents,
        traceId,
        request.logger
      )

      const { error } = accompanyingDocumentsSchema.validate(
        {
          documentType,
          documentReference,
          'issueDate-day': issueDateDay,
          'issueDate-month': issueDateMonth,
          'issueDate-year': issueDateYear,
          crumb
        },
        { abortEarly: false }
      )

      const partialDateError = validatePartialDate(request.payload)

      const schemaErrors = error ? error.details : []
      const dateErrors = partialDateError ? partialDateError.details : []

      if (documents.length >= MAX_DOCUMENTS) {
        return h
          .view(
            'accompanying-documents/index',
            buildPageModel(documentsWithStatus, 0, {
              errorList: [
                {
                  href: '#documentType',
                  text: `You can add a maximum of ${MAX_DOCUMENTS} documents`
                }
              ]
            })
          )
          .code(statusCodes.badRequest)
      }

      const hasFile = fileData?.payload?.length > 0
      const filename = fileData?.filename ?? ''
      const ext = filename.includes('.')
        ? `.${filename.split('.').pop().toLowerCase()}`
        : ''
      const validFileType = !hasFile || ALLOWED_EXTENSIONS.has(ext)

      const fileErrors = []
      if (!hasFile) {
        fileErrors.push({
          message: 'Select a file to upload',
          path: ['file'],
          type: 'any.required',
          context: { label: 'file', key: 'file' }
        })
      } else if (!validFileType) {
        fileErrors.push({
          message:
            'The selected file must be a PDF, DOC, DOCX, JPEG, PNG or XLS',
          path: ['file'],
          type: 'any.invalid',
          context: { label: 'file', key: 'file' }
        })
      }

      const allErrors = [...schemaErrors, ...dateErrors, ...fileErrors]

      if (allErrors.length > 0) {
        // Error summary: one entry per date group — only first date error links to the date input.
        // Field errors: all date errors, so each individual input can be highlighted correctly.
        const summaryErrors = [
          ...schemaErrors,
          ...dateErrors.slice(0, 1),
          ...fileErrors
        ]
        const { errorList } = formatValidationErrors({ details: summaryErrors })
        const { fieldErrors } = formatValidationErrors({ details: allErrors })

        return h
          .view(
            'accompanying-documents/index',
            buildPageModel(documentsWithStatus, attempt, {
              documentType,
              documentReference,
              issueDate_day: issueDateDay,
              issueDate_month: issueDateMonth,
              issueDate_year: issueDateYear,
              crumb,
              errorList,
              fieldErrors
            })
          )
          .code(statusCodes.badRequest)
      }

      const year = String(issueDateYear).padStart(4, '0')
      const month = String(issueDateMonth).padStart(2, '0')
      const day = String(issueDateDay).padStart(2, '0')
      const dateOfIssue = `${year}-${month}-${day}`

      let uploadId
      try {
        const notificationRef = getSessionValue(
          request,
          sessionKeys.referenceNumber
        )
        if (!notificationRef) {
          request.logger.warn(
            'Document upload initiated without referenceNumber in session; backend will reject'
          )
        }
        const redirectUrl = `${frontendBaseUrl}/accompanying-documents`
        const response = await documentClient.initiate(
          notificationRef,
          {
            documentType,
            documentReference,
            dateOfIssue,
            redirectUrl,
            maxFileSize: MAX_FILE_SIZE_BYTES,
            mimeTypes: ALLOWED_MIME_TYPES
          },
          traceId
        )
        uploadId = response?.uploadId
        request.logger.info(`Document upload initiated: uploadId=${uploadId}`)

        const formData = new FormData()
        const contentType =
          fileData.headers?.['content-type'] ?? 'application/octet-stream'
        const blob = new Blob([fileData.payload], { type: contentType })
        formData.append('file', blob, fileData.filename ?? 'upload')

        const uploadResponse = await fetch(response.uploadUrl, {
          method: 'POST',
          body: formData,
          redirect: 'manual'
        })
        // cdp-uploader redirects (302) on success; Node.js fetch with
        // redirect:'manual' returns the actual redirect status, not status 0.
        // Local mock returns 200 directly. Fail only on 4xx/5xx.
        if (uploadResponse.status >= 400) {
          throw new Error(
            `cdp-uploader returned unexpected status ${uploadResponse.status}`
          )
        }
        request.logger.info(
          `File proxied to cdp-uploader: uploadId=${uploadId}`
        )
      } catch (err) {
        request.logger.error(`Failed to upload document: ${err.message}`)
        return h
          .view(
            'accompanying-documents/index',
            buildPageModel(documentsWithStatus, attempt, {
              documentType,
              documentReference,
              issueDate_day: issueDateDay,
              issueDate_month: issueDateMonth,
              issueDate_year: issueDateYear,
              errorList: [
                {
                  href: '#file',
                  text: 'The file could not be uploaded. Try again.'
                }
              ]
            })
          )
          .code(statusCodes.internalServerError)
      }

      documents.push({
        uploadId,
        filename: fileData.filename ?? 'upload',
        documentType,
        documentReference,
        dateOfIssue
      })
      setSessionValue(request, sessionKeys.documents, documents)

      return h.redirect('/accompanying-documents')
    }
  }
}
