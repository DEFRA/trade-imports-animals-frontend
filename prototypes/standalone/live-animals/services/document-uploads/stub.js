import { randomUUID } from 'node:crypto'

const REJECTED_FILENAME = /virus/i
const NEVER_SCANS_FILENAME = /never-scans/i

const SCAN_STATUS_PENDING = 'PENDING'
const SCAN_STATUS_REJECTED = 'REJECTED'
const SCAN_STATUS_COMPLETE = 'COMPLETE'

const awaitingRefresh = new Set()

const PLACEHOLDER_TEXT =
  'Placeholder file - the prototype does not store uploaded bytes.'

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
  if (NEVER_SCANS_FILENAME.test(filename)) return SCAN_STATUS_PENDING
  return REJECTED_FILENAME.test(filename)
    ? SCAN_STATUS_REJECTED
    : SCAN_STATUS_COMPLETE
}

export const documentUploads = {
  upload: async () => {
    const uploadId = randomUUID()
    awaitingRefresh.add(uploadId)
    return uploadId
  },

  scanStatus: async ({ uploadId, filename, refresh }) => {
    if (!awaitingRefresh.has(uploadId)) return settledStatus(filename)
    if (!refresh) return SCAN_STATUS_PENDING
    awaitingRefresh.delete(uploadId)
    return settledStatus(filename)
  },

  remove: async (uploadId) => {
    awaitingRefresh.delete(uploadId)
  },

  // The stub keeps no bytes — an upload here is only a scan lifecycle — so
  // every download serves the same canned one-page PDF.
  streamFile: async () =>
    new Response(PLACEHOLDER_PDF, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'inline; filename="placeholder.pdf"'
      }
    })
}
