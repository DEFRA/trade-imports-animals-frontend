import {
  setSessionValue,
  getSessionValue
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

function renderForm(h, values = {}) {
  return h.view('accompanying-documents/index', {
    pageTitle: 'Accompanying documents',
    heading: 'Accompanying documents',
    ...values
  })
}

export const accompanyingDocumentsController = {
  get: {
    handler(request, h) {
      return renderForm(h, {
        documentType: getSessionValue(request, 'documentType'),
        documentReference: getSessionValue(request, 'documentReference'),
        'issueDate-day': getSessionValue(request, 'issueDate-day'),
        'issueDate-month': getSessionValue(request, 'issueDate-month'),
        'issueDate-year': getSessionValue(request, 'issueDate-year')
      })
    }
  },
  post: {
    async handler(request, h) {
      const {
        'issueDate-day': issueDateDay,
        'issueDate-month': issueDateMonth,
        'issueDate-year': issueDateYear,
        documentType,
        documentReference,
        crumb,
        file: fileData
      } = request.payload

      if (!documentType) {
        return h.redirect('/')
      }

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
      const hasFile = fileData?.payload?.length > 0

      const allErrors = []
      if (error) allErrors.push(...error.details)
      if (partialDateError) allErrors.push(...partialDateError.details)
      if (!hasFile) {
        allErrors.push({
          message: 'Select a file to upload',
          path: ['file'],
          type: 'any.required',
          context: { label: 'file', key: 'file' }
        })
      }

      if (allErrors.length > 0) {
        const formattedErrors = formatValidationErrors({ details: allErrors })
        return renderForm(h, {
          documentType,
          documentReference,
          'issueDate-day': issueDateDay,
          'issueDate-month': issueDateMonth,
          'issueDate-year': issueDateYear,
          crumb,
          errorList: formattedErrors.errorList,
          fieldErrors: formattedErrors.fieldErrors
        }).code(statusCodes.badRequest)
      }

      setSessionValue(request, 'documentType', documentType)
      setSessionValue(request, 'documentReference', documentReference)
      setSessionValue(request, 'issueDate-day', issueDateDay)
      setSessionValue(request, 'issueDate-month', issueDateMonth)
      setSessionValue(request, 'issueDate-year', issueDateYear)

      const year = String(issueDateYear).padStart(4, '0')
      const month = String(issueDateMonth).padStart(2, '0')
      const day = String(issueDateDay).padStart(2, '0')
      const dateOfIssue = `${year}-${month}-${day}`

      const notificationRef = getSessionValue(request, 'referenceNumber')
      const traceId = getTraceId() ?? ''

      let uploadId
      try {
        const redirectUrl = `${frontendBaseUrl}/accompanying-documents/upload-received`
        const response = await documentClient.initiate(
          notificationRef,
          { documentType, documentReference, dateOfIssue, redirectUrl },
          traceId
        )
        uploadId = response?.uploadId
        setSessionValue(request, 'uploadId', uploadId)
        request.logger.info(`Document upload initiated: uploadId=${uploadId}`)

        const formData = new FormData()
        const contentType =
          fileData.headers?.['content-type'] || 'application/octet-stream'
        const blob = new Blob([fileData.payload], { type: contentType })
        formData.append('file', blob, fileData.filename || 'upload')

        await fetch(response.uploadUrl, {
          method: 'POST',
          body: formData,
          redirect: 'manual'
        })
        request.logger.info(
          `File proxied to cdp-uploader: uploadId=${uploadId}`
        )
      } catch (err) {
        request.logger.error(`Failed to upload document: ${err.message}`)
        if (uploadId) setSessionValue(request, 'uploadId', null)
        return h.redirect('/accompanying-documents')
      }

      return h.redirect('/accompanying-documents/upload-received')
    }
  }
}
