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

const allowedTypeLabels = ALLOWED_TYPES.map((type) => type.ext.toUpperCase())

/**
 * The accepted file types as a list in the language of the given documents
 * copy: commas between them and the copy's word for "or" before the last.
 *
 * @param {object} documentsCopy - a locale of the documents copy.
 * @returns {string} the list, such as `PDF, DOC or XLSX`.
 */
export const allowedFileTypesHint = (documentsCopy) =>
  `${allowedTypeLabels.slice(0, -1).join(', ')} ${documentsCopy.file.or} ${allowedTypeLabels.at(-1)}`

export const fileTypeMessage = (documentsCopy) =>
  documentsCopy.errors.fileType(allowedFileTypesHint(documentsCopy))

const MAX_FILE_SIZE_MB = 50
const BYTES_PER_MEGABYTE = 1_000_000
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MEGABYTE
export const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_MB}MB`
export const oversizeMessage = (documentsCopy) =>
  documentsCopy.errors.oversize(MAX_FILE_SIZE_LABEL)

export const exceedsMaxFileSize = (byteCount, limit = MAX_FILE_SIZE_BYTES) =>
  Number.isFinite(byteCount) && Number.isFinite(limit) && byteCount > limit

const fileExtension = (filename = '') =>
  filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''

export const attachmentTypeFor = (filename) => {
  const ext = fileExtension(filename)
  return ALLOWED_TYPES.some((type) => type.ext === ext)
    ? ext.toUpperCase()
    : null
}
