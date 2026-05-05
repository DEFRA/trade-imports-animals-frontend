/**
 * Single source of truth for all accompanying-document upload constraints.
 * Consumers import ALLOWED_TYPES and derive extension/MIME lists locally
 * rather than duplicating the underlying allow-list.
 */

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

// User-facing hint listing the allowed file types, derived from ALLOWED_TYPES
// so the template never drifts from the real allow-list. JPEG and JPG share
// the same MIME type (image/jpeg), so we de-duplicate by MIME — keeping only
// the first extension per MIME — to avoid showing both "JPEG" and "JPG".
const seenMimes = new Set()
const allowedTypeLabels = ALLOWED_TYPES.filter((type) => {
  if (seenMimes.has(type.mime)) return false
  seenMimes.add(type.mime)
  return true
}).map((type) => type.ext.toUpperCase())

// Use en-GB so the Oxford comma is omitted ("X, Y or Z" not "X, Y, or Z"),
// matching GDS plain-English style.
export const ALLOWED_FILE_TYPES_HINT = new Intl.ListFormat('en-GB', {
  type: 'disjunction'
}).format(allowedTypeLabels)

export const MAX_FILE_SIZE_BYTES = 52_428_800 // 50 MB

// Headroom added on top of MAX_FILE_SIZE_BYTES so the Hapi route payload limit
// covers the multipart envelope (form-field bytes and boundary markers) around
// a 50 MB file. Without this buffer a precisely 50 MB upload would be rejected
// by Hapi before the controller's size check could produce a friendly error.
const MULTIPART_OVERHEAD_BYTES = 1024
export const MAX_PAYLOAD_BYTES = MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES

export const MAX_DOCUMENTS = 10

export const MAX_DOCUMENT_REFERENCE_LENGTH = 100

export const DOCUMENT_TYPE_OPTIONS = [
  {
    value: 'ITAHC',
    text: 'Intra-Trade Animal Health Certificate (ITAHC)'
  },
  {
    value: 'VETERINARY_HEALTH_CERTIFICATE',
    text: 'Veterinary health certificate'
  }
]

export const DOCUMENT_TYPES = DOCUMENT_TYPE_OPTIONS.map(
  (option) => option.value
)

const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TYPE_OPTIONS.map((option) => [option.value, option.text])
)

export const getDocumentTypeLabel = (value) =>
  DOCUMENT_TYPE_LABELS[value] ?? value
