import { randomUUID } from 'node:crypto'

const REJECTED_FILENAME = /virus/i
const NEVER_SCANS_FILENAME = /never-scans/i

const SCAN_STATUS_PENDING = 'PENDING'
const SCAN_STATUS_REJECTED = 'REJECTED'
const SCAN_STATUS_COMPLETE = 'COMPLETE'

const uploads = new Map()

const notFound = (uploadId) => {
  const error = new Error(`Unknown document upload: ${uploadId}`)
  error.status = 404
  return error
}

const uploadOrThrow = (uploadId) => {
  const upload = uploads.get(uploadId)
  if (!upload) {
    throw notFound(uploadId)
  }
  return upload
}

const PLACEHOLDER_TEXT =
  'Placeholder file - the service does not store uploaded bytes.'

const PLACEHOLDER_STREAM = `BT /F1 12 Tf 20 60 Td (${PLACEHOLDER_TEXT}) Tj ET\n`

const PLACEHOLDER_PDF = [
  '%PDF-1.4',
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 120]' +
    '/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>endobj',
  `4 0 obj<</Length ${PLACEHOLDER_STREAM.length}>>stream`,
  `${PLACEHOLDER_STREAM}endstream endobj`,
  '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj',
  'trailer<</Size 6/Root 1 0 R>>',
  '%%EOF'
].join('\n')

const settledStatus = (filename = '') => {
  if (NEVER_SCANS_FILENAME.test(filename)) {
    return SCAN_STATUS_PENDING
  }
  return REJECTED_FILENAME.test(filename)
    ? SCAN_STATUS_REJECTED
    : SCAN_STATUS_COMPLETE
}

export const documentUploads = {
  upload: async ({ journeyId, filename } = {}) => {
    const uploadId = randomUUID()
    uploads.set(uploadId, { journeyId, filename, settled: false })
    return uploadId
  },

  // An id this stub never issued is a not-found, exactly as the backend
  // answers it — a forged or foreign id must never look like a settled scan.
  scanStatus: async ({ uploadId, filename, refresh }) => {
    const upload = uploadOrThrow(uploadId)
    const knownFilename = upload.filename ?? filename
    if (upload.settled) {
      return settledStatus(knownFilename)
    }
    if (!refresh) {
      return SCAN_STATUS_PENDING
    }
    const status = settledStatus(knownFilename)
    if (status !== SCAN_STATUS_PENDING) {
      upload.settled = true
    }
    return status
  },

  ownerOf: async (uploadId) => uploadOrThrow(uploadId).journeyId,

  remove: async (uploadId) => {
    uploads.delete(uploadId)
  },

  // The stub keeps no bytes — an upload here is only a scan lifecycle — so
  // every download serves the same canned one-page PDF.
  streamFile: async (uploadId) => {
    uploadOrThrow(uploadId)
    return new Response(PLACEHOLDER_PDF, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="placeholder.pdf"'
      }
    })
  }
}
