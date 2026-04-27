/**
 * Single source of truth for all accompanying-document upload constraints.
 * Import the derived ALLOWED_EXTENSIONS / ALLOWED_MIME_TYPES helpers from here
 * rather than duplicating them across controller, index, and schema.
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

export const MAX_FILE_SIZE_BYTES = 52_428_800 // 50 MB

// MAX_PAYLOAD_BYTES matches MAX_FILE_SIZE_BYTES but is kept separate because
// it is set on the Hapi route payload option and must cover multipart overhead
// (form fields, boundary markers) on top of the raw file bytes.
export const MAX_PAYLOAD_BYTES = 52_428_800 // 50 MB

export const MAX_DOCUMENTS = 10

export const MAX_DOCUMENT_REFERENCE_LENGTH = 100

export const DOCUMENT_TYPES = ['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE']
