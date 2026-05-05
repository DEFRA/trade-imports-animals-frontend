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

export const resolveDownloadContentType = (headers) => {
  const rawContentType = headers.get('content-type') ?? DEFAULT_CONTENT_TYPE
  const mimeType = rawContentType.split(';')[0].trim().toLowerCase()
  return ALLOWED_DOWNLOAD_CONTENT_TYPES.has(mimeType)
    ? mimeType
    : DEFAULT_CONTENT_TYPE
}

export const resolveContentDisposition = (headers) =>
  headers.get('content-disposition') ?? DEFAULT_CONTENT_DISPOSITION
