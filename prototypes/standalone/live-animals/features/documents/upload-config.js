import { copy as en } from './copy.en.js'

export const ALLOWED_TYPES = [
  { ext: 'pdf', mime: 'application/pdf' },
  { ext: 'doc', mime: 'application/msword' },
  {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  },
  { ext: 'jpeg', mime: 'image/jpeg' },
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'png', mime: 'image/png' },
  { ext: 'xls', mime: 'application/vnd.ms-excel' },
  {
    ext: 'xlsx',
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
]

export const ALLOWED_MIME_TYPES = [
  ...new Set(ALLOWED_TYPES.map((type) => type.mime))
]

export const ACCEPT_ATTRIBUTE = ALLOWED_TYPES.map(
  (type) => `.${type.ext}`
).join(',')

const allowedTypeLabels = ALLOWED_TYPES.map((type) => type.mime)
  .filter((mime, index, mimes) => mimes.indexOf(mime) === index)
  .map((mime) =>
    ALLOWED_TYPES.find((type) => type.mime === mime).ext.toUpperCase()
  )

export const ALLOWED_FILE_TYPES_HINT = new Intl.ListFormat('en-GB', {
  type: 'disjunction'
}).format(allowedTypeLabels)

export const FILE_TYPE_MESSAGE = en.errors.fileType(ALLOWED_FILE_TYPES_HINT)

const MAX_FILE_SIZE_MB = 50
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1000 * 1000
export const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_MB}MB`
export const OVERSIZE_FILE_MESSAGE = en.errors.oversize(MAX_FILE_SIZE_LABEL)

const MULTIPART_OVERHEAD_BYTES = 1024
export const MAX_PAYLOAD_BYTES = MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES

const fileExtension = (filename = '') =>
  filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''

export const attachmentTypeFor = (filename) => {
  const ext = fileExtension(filename)
  return ALLOWED_TYPES.some((type) => type.ext === ext)
    ? ext.toUpperCase()
    : null
}
