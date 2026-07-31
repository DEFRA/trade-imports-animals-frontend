import { documentUploads } from '../../../services/document-uploads/index.js'
import { SCAN_STATUS } from '../scan-poll.js'

export const scanStatusOf = async (entry, refresh) => {
  if (!entry.uploadId) return SCAN_STATUS.COMPLETE
  try {
    return await documentUploads.scanStatus({
      uploadId: entry.uploadId,
      filename: entry.filename,
      refresh
    })
  } catch {
    return SCAN_STATUS.PENDING
  }
}

export const withScanStatus = (documents, refresh) =>
  Promise.all(
    documents.map(async (item) => ({
      ...item,
      scanStatus: await scanStatusOf(item.entry, refresh)
    }))
  )

export const scanned = (documents) =>
  documents
    .filter(({ entry }) => entry.uploadId)
    .map(({ entry, scanStatus }) => ({ uploadId: entry.uploadId, scanStatus }))

export const isStillSettling = (documents) =>
  documents.some((item) => item.scanStatus !== SCAN_STATUS.COMPLETE)
