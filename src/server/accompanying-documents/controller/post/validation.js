import { accompanyingDocumentsSchema } from '../../accompanying-documents-schema.js'
import { validatePartialDate } from '../../partial-date-validator.js'
import {
  ALLOWED_TYPES,
  MAX_FILE_SIZE_BYTES,
  OVERSIZE_FILE_MESSAGE
} from '../../document-upload-config.js'

const ALLOWED_EXTENSIONS = new Set(ALLOWED_TYPES.map((type) => `.${type.ext}`))

const buildFileError = (message, type) => ({
  message,
  path: ['file'],
  type,
  context: { label: 'file', key: 'file' }
})

const validateFormFields = (payload) => {
  const { error } = accompanyingDocumentsSchema.validate(
    {
      documentType: payload.documentType,
      documentReference: payload.documentReference,
      'issueDate-day': payload['issueDate-day'],
      'issueDate-month': payload['issueDate-month'],
      'issueDate-year': payload['issueDate-year'],
      crumb: payload.crumb
    },
    { abortEarly: false }
  )
  return error ? error.details : []
}

const validateDate = (payload) => {
  const partialDateError = validatePartialDate(payload)
  return partialDateError ? partialDateError.details : []
}

const fileExtension = (filename) => {
  if (!filename.includes('.')) {
    return ''
  }
  return `.${filename.split('.').pop().toLowerCase()}`
}

export const validateFile = (fileData) => {
  const hasFile = fileData?.payload?.length > 0
  if (!hasFile) {
    return [buildFileError('Select a file to upload', 'any.required')]
  }
  // Catch files in the window between MAX_FILE_SIZE_BYTES and the Hapi
  // route-level MAX_PAYLOAD_BYTES — the Boom 413 hook only fires above the
  // route cap, so without this we'd accept anything in the multipart-envelope
  // headroom (which is also the no-JS gap above the client preflight).
  if (fileData.payload.length > MAX_FILE_SIZE_BYTES) {
    return [buildFileError(OVERSIZE_FILE_MESSAGE, 'any.invalid')]
  }
  if (!ALLOWED_EXTENSIONS.has(fileExtension(fileData?.filename ?? ''))) {
    return [
      buildFileError(
        'The selected file must be a PDF, DOC, DOCX, JPEG, PNG or XLS',
        'any.invalid'
      )
    ]
  }
  return []
}

export const collectValidationErrors = (payload, fileData) => {
  const schemaErrors = validateFormFields(payload)
  const dateErrors = validateDate(payload)
  const fileErrors = validateFile(fileData)
  return {
    schemaErrors,
    dateErrors,
    fileErrors,
    allErrors: [...schemaErrors, ...dateErrors, ...fileErrors]
  }
}
