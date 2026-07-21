import { randomUUID } from 'node:crypto'

const REJECTED_FILENAME = /virus/i
const NEVER_SCANS_FILENAME = /never-scans/i

const SCAN_STATUS_PENDING = 'PENDING'
const SCAN_STATUS_REJECTED = 'REJECTED'
const SCAN_STATUS_COMPLETE = 'COMPLETE'

const awaitingRefresh = new Set()

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
  }
}
