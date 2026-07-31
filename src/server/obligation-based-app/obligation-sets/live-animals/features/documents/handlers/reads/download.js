import { Readable } from 'node:stream'
import {
  resolveContentDisposition,
  resolveDownloadContentType
} from '../../download-content-type.js'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '../../upload-config.js'

export const pad = (value, length) => String(value ?? '').padStart(length, '0')

export const isoDate = ({ day, month, year } = {}) => {
  const paddedYear = pad(year, 4)
  const paddedMonth = pad(month, 2)
  const paddedDay = pad(day, 2)
  return `${paddedYear}-${paddedMonth}-${paddedDay}`
}

export const fileResponse = (h, streamed) =>
  h
    .response(Readable.fromWeb(streamed.body))
    .header('Content-Type', resolveDownloadContentType(streamed.headers))
    .header('Content-Disposition', resolveContentDisposition(streamed.headers))
    .header('X-Content-Type-Options', 'nosniff')

export const uploadDetails = (journey, entry, file, filename) => ({
  journeyId: journey.journeyId,
  filename,
  contentType: file.headers?.['content-type'],
  bytes: file.payload,
  documentType: entry.accompanyingDocumentType,
  documentReference: entry.accompanyingDocumentReference,
  dateOfIssue: isoDate(entry.accompanyingDocumentDateOfIssue),
  maxFileSize: MAX_FILE_SIZE_BYTES,
  mimeTypes: ALLOWED_MIME_TYPES
})
