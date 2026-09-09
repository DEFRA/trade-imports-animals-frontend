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

// Label every accepted extension, not the de-duplicated MIME types: .jpeg and
// .jpg share image/jpeg, so collapsing on MIME dropped JPG from the sentence
// while the input still accepted it. See EUDPA-523.
const allowedTypeLabels = ALLOWED_TYPES.map((type) => type.ext.toUpperCase())

export const ALLOWED_FILE_TYPES_HINT = new Intl.ListFormat('en-GB', {
  type: 'disjunction'
}).format(allowedTypeLabels)

export const FILE_TYPE_MESSAGE = en.errors.fileType(ALLOWED_FILE_TYPES_HINT)

// Held at 10 so MAX_PAYLOAD_BYTES stays inside the ingress request-body cap in
// front of this service, which on CDP is nginx's 10 MiB default. EUDPA-518
// raised this to 50 for Design release 1; a 50MB upload never reaches the
// service, so the limit goes back until the ingress cap is raised with it.
const MAX_FILE_SIZE_MB = 10
const BYTES_PER_MEGABYTE = 1_000_000
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * BYTES_PER_MEGABYTE
export const MAX_FILE_SIZE_LABEL = `${MAX_FILE_SIZE_MB}MB`
export const OVERSIZE_FILE_MESSAGE = en.errors.oversize(MAX_FILE_SIZE_LABEL)

const MULTIPART_OVERHEAD_BYTES = 1024
export const MAX_PAYLOAD_BYTES = MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES

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
