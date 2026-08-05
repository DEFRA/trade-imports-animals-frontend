import { documentUploads } from '../../../../../services/document-uploads/index.js'
import { MAX_POLL_ATTEMPTS, SCAN_STATUS, allowsContinue } from '../scan-poll.js'

// A read failure fails CLOSED to checking, so an unknown state never counts as
// clean. Past the attempt ceiling it becomes a distinguishable recoverable
// state rather than pretending to be a scan still in progress.
const unreadable = (attempt) =>
  attempt >= MAX_POLL_ATTEMPTS ? SCAN_STATUS.UNAVAILABLE : SCAN_STATUS.PENDING

export const scanStatusOf = async (entry, { refresh, attempt = 0 } = {}) => {
  if (!entry.uploadId) return SCAN_STATUS.NO_FILE
  try {
    return await documentUploads.scanStatus({
      uploadId: entry.uploadId,
      filename: entry.filename,
      refresh
    })
  } catch {
    return unreadable(attempt)
  }
}

export const withScanStatus = (documents, options) =>
  Promise.all(
    documents.map(async (item) => ({
      ...item,
      scanStatus: await scanStatusOf(item.entry, options)
    }))
  )

export const isStillSettling = (documents) =>
  documents.some((item) => !allowsContinue(item.scanStatus))
