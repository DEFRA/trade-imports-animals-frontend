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
import { documentClient } from '../common/clients/document-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import { config } from '../../config/config.js'

const frontendBaseUrl = config.get('frontendBaseUrl')
const MAX_POLLING_ATTEMPTS = 10

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpeg',
  '.jpg',
  '.png',
  '.xls',
  '.xlsx'
])

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

const MAX_FILE_SIZE_BYTES = 52428800 // 50MB

async function getDocumentsWithStatus(documents, traceId, logger) {
  return Promise.all(
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
}

function buildPageModel(documentsWithStatus, attempt, extra = {}) {
  const anyPending = documentsWithStatus.some((d) => d.scanStatus === 'PENDING')
  const anyRejected = documentsWithStatus.some(
    (d) => d.scanStatus === 'REJECTED'
  )
  const timedOut = anyPending && attempt >= MAX_POLLING_ATTEMPTS

  const rejectedErrors = documentsWithStatus
    .filter((d) => d.scanStatus === 'REJECTED')
    .map((d) => ({
      href: '#documents-added',
      text: `${d.filename} contains a virus. Remove it and try again with a different file.`
    }))

  return {
    pageTitle: 'Accompanying documents',
    documents: documentsWithStatus,
    anyPending,
    timedOut,
    nextAttempt: attempt + 1,
    canContinue: !anyPending && !anyRejected,
    ...extra,
    // Merge rejected errors with any form validation errors from `extra`
    errorList: [...(rejectedErrors ?? []), ...(extra.errorList ?? [])].length
      ? [...(rejectedErrors ?? []), ...(extra.errorList ?? [])]
      : null
  }
}

export const accompanyingDocumentsController = {
  status: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const rawDocuments = getSessionValue(request, 'documents') ?? []
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
      const attempt = parseInt(request.query.attempt ?? '0', 10)
      const rawDocuments = getSessionValue(request, 'documents') ?? []
      const referenceNumber = getSessionValue(request, 'referenceNumber')

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
  post: {
    async handler(request, h) {
      const traceId = getTraceId() ?? ''
      const { _action } = request.payload

      if (_action?.startsWith('remove-')) {
        const uploadId = _action.slice('remove-'.length)
        try {
          await documentClient.delete(uploadId, traceId)
        } catch (err) {
          request.logger.error(
            `Failed to delete document from backend: ${err.message}`
          )
          return h.redirect('/accompanying-documents')
        }
        const documents = getSessionValue(request, 'documents') ?? []
        setSessionValue(
          request,
          'documents',
          documents.filter((d) => d.uploadId !== uploadId)
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

      const schemaErrors = []
      if (error) schemaErrors.push(...error.details)
      if (partialDateError) schemaErrors.push(...partialDateError.details)

      const documents = getSessionValue(request, 'documents') ?? []
      if (documents.length >= 10) {
        const documentsWithStatus = await getDocumentsWithStatus(
          documents,
          traceId,
          request.logger
        )
        return h
          .view(
            'accompanying-documents/index',
            buildPageModel(documentsWithStatus, 0, {
              errorList: [
                {
                  href: '#documentType',
                  text: 'You can add a maximum of 10 documents'
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

      const allErrors = [...schemaErrors]
      if (!hasFile) {
        allErrors.push({
          message: 'Select a file to upload',
          path: ['file'],
          type: 'any.required',
          context: { label: 'file', key: 'file' }
        })
      } else if (!validFileType) {
        allErrors.push({
          message:
            'The selected file must be a PDF, DOC, DOCX, JPEG, PNG or XLS',
          path: ['file'],
          type: 'any.invalid',
          context: { label: 'file', key: 'file' }
        })
      }

      if (allErrors.length > 0) {
        const attempt = parseInt(request.query.attempt ?? '0', 10)
        const rawDocuments = getSessionValue(request, 'documents') ?? []
        const documentsWithStatus = await getDocumentsWithStatus(
          rawDocuments,
          traceId,
          request.logger
        )

        const formattedErrors = formatValidationErrors({ details: allErrors })
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
              errorList: formattedErrors.errorList,
              fieldErrors: formattedErrors.fieldErrors
            })
          )
          .code(statusCodes.badRequest)
      }

      const year = String(issueDateYear).padStart(4, '0')
      const month = String(issueDateMonth).padStart(2, '0')
      const day = String(issueDateDay).padStart(2, '0')
      const dateOfIssue = `${year}-${month}-${day}`

      const notificationRef = getSessionValue(request, 'referenceNumber')

      let uploadId
      try {
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
          fileData.headers?.['content-type'] || 'application/octet-stream'
        const blob = new Blob([fileData.payload], { type: contentType })
        formData.append('file', blob, fileData.filename || 'upload')

        const uploadResponse = await fetch(response.uploadUrl, {
          method: 'POST',
          body: formData,
          redirect: 'manual'
        })
        // cdp-uploader redirects on success (3xx) — treat any non-redirect as failure
        if (uploadResponse.status < 300 || uploadResponse.status >= 400) {
          throw new Error(
            `cdp-uploader returned status ${uploadResponse.status}`
          )
        }
        request.logger.info(
          `File proxied to cdp-uploader: uploadId=${uploadId}`
        )
      } catch (err) {
        request.logger.error(`Failed to upload document: ${err.message}`)
        return h.redirect('/accompanying-documents')
      }

      documents.push({
        uploadId,
        filename: fileData.filename || 'upload',
        documentType,
        documentReference,
        dateOfIssue
      })
      setSessionValue(request, 'documents', documents)

      return h.redirect('/accompanying-documents')
    }
  }
}
