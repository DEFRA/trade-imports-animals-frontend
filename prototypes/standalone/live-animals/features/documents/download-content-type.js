import { ALLOWED_MIME_TYPES } from './upload-config.js'

export const DEFAULT_CONTENT_TYPE = 'application/octet-stream'
const DEFAULT_CONTENT_DISPOSITION = 'attachment'

// Only a type the journey accepts on the way in is echoed on the way out;
// anything else is served as bytes so the browser never renders it.
const ALLOWED_DOWNLOAD_CONTENT_TYPES = new Set([
  ...ALLOWED_MIME_TYPES,
  DEFAULT_CONTENT_TYPE
])

export const resolveDownloadContentType = (headers) => {
  const mimeType = (headers.get('content-type') ?? DEFAULT_CONTENT_TYPE)
    .split(';')[0]
    .trim()
    .toLowerCase()
  return ALLOWED_DOWNLOAD_CONTENT_TYPES.has(mimeType)
    ? mimeType
    : DEFAULT_CONTENT_TYPE
}

export const resolveContentDisposition = (headers) =>
  headers.get('content-disposition') ?? DEFAULT_CONTENT_DISPOSITION
