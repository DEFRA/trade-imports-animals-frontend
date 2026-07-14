import { randomUUID } from 'node:crypto'

const REJECTED_FILENAME = /virus/i
const NEVER_SCANS_FILENAME = /never-scans/i

const awaitingRefresh = new Set()

const settledStatus = (filename = '') => {
  if (NEVER_SCANS_FILENAME.test(filename)) return 'PENDING'
  return REJECTED_FILENAME.test(filename) ? 'REJECTED' : 'COMPLETE'
}

export const documentUploads = {
  async upload() {
    const uploadId = randomUUID()
    awaitingRefresh.add(uploadId)
    return uploadId
  },

  async scanStatus({ uploadId, filename, refresh }) {
    if (!awaitingRefresh.has(uploadId)) return settledStatus(filename)
    if (!refresh) return 'PENDING'
    awaitingRefresh.delete(uploadId)
    return settledStatus(filename)
  },

  async remove(uploadId) {
    awaitingRefresh.delete(uploadId)
  }
}
