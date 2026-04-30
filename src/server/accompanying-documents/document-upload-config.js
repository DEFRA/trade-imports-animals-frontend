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

// Headroom added on top of MAX_FILE_SIZE_BYTES so the Hapi route payload limit
// covers the multipart envelope (form-field bytes and boundary markers) around
// a 50 MB file. Without this buffer a precisely 50 MB upload would be rejected
// by Hapi before the controller's size check could produce a friendly error.
const MULTIPART_OVERHEAD_BYTES = 1024
export const MAX_PAYLOAD_BYTES = MAX_FILE_SIZE_BYTES + MULTIPART_OVERHEAD_BYTES

export const MAX_DOCUMENTS = 10

export const MAX_DOCUMENT_REFERENCE_LENGTH = 100

export const DOCUMENT_TYPES = ['ITAHC', 'VETERINARY_HEALTH_CERTIFICATE']
