import { copy as en } from './copy/copy.en.js'

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

const allowedTypeLabels = ALLOWED_MIME_TYPES.map((mime) =>
  ALLOWED_TYPES.find((type) => type.mime === mime).ext.toUpperCase()
)

export const ALLOWED_FILE_TYPES_HINT = new Intl.ListFormat('en-GB', {
  type: 'disjunction'
}).format(allowedTypeLabels)

export const FILE_TYPE_MESSAGE = en.errors.fileType(ALLOWED_FILE_TYPES_HINT)

// 10 MB decimal (not MiB) so the user-facing "10 MB" hint is literally
// accurate and we stay ~485 KB clear of the CDP nginx ingress 10 MiB cap.
const BYTES_PER_KB = 1000
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB
const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MB
export const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_MB} MB`
export const OVERSIZE_FILE_MESSAGE = en.errors.oversize(MAX_FILE_SIZE_LABEL)

// Slack for the multipart envelope so an at-limit file always reaches field
// validation: boundaries, per-part headers, a long filename and the metadata
// parts all live in here, and the total stays under the 10 MiB ingress cap.
const BYTES_PER_KIB = 1024
const MULTIPART_OVERHEAD_KIB = 64
const MULTIPART_OVERHEAD_BYTES = MULTIPART_OVERHEAD_KIB * BYTES_PER_KIB
export const MAX_PAYLOAD_BYTES = MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES

export const exceedsMaxFileSize = (byteCount, limit = MAX_FILE_SIZE_BYTES) =>
  Number.isFinite(byteCount) && Number.isFinite(limit) && byteCount > limit

const fileExtension = (filename = '') =>
  filename.includes('.') ? filename.split('.').pop().toLowerCase() : ''

export const isAllowedFilename = (filename) =>
  ALLOWED_TYPES.some((type) => type.ext === fileExtension(filename))
