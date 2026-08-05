import { documentUploads } from '../../../../../../services/document-uploads/index.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../../upload-config.js'

const YEAR_DIGITS = 4
const MONTH_DAY_DIGITS = 2

const pad = (value, length) => String(value ?? '').padStart(length, '0')

export const isoDate = ({ day, month, year } = {}) =>
  `${pad(year, YEAR_DIGITS)}-${pad(month, MONTH_DAY_DIGITS)}-${pad(day, MONTH_DAY_DIGITS)}`

export const uploadDetails = (journey, entry, file) => ({
  journeyId: journey.journeyId,
  filename: file.filename,
  contentType: file.headers?.['content-type'],
  bytes: file.payload,
  documentType: entry.documentType,
  documentReference: entry.documentReference,
  dateOfIssue: isoDate(entry.issueDate),
  maxFileSize: MAX_FILE_SIZE_BYTES,
  mimeTypes: ALLOWED_MIME_TYPES
})

export const uploadDocumentFile = async (journey, entry, file) =>
  documentUploads.upload(uploadDetails(journey, entry, file))
