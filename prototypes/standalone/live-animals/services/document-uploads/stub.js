import { randomUUID } from 'node:crypto'

const REJECTED_FILENAME = /virus/i
const NEVER_SCANS_FILENAME = /never-scans/i

const statusReads = new Map()

const settledStatus = (filename = '') => {
  if (NEVER_SCANS_FILENAME.test(filename)) return 'PENDING'
  return REJECTED_FILENAME.test(filename) ? 'REJECTED' : 'COMPLETE'
}

export const documentUploads = {
  async upload() {
    const uploadId = randomUUID()
    statusReads.set(uploadId, 0)
    return uploadId
  },

  async scanStatus({ uploadId, filename }) {
    if (statusReads.get(uploadId) === 0) {
      statusReads.set(uploadId, 1)
      return 'PENDING'
    }
    return settledStatus(filename)
  },

  async remove(uploadId) {
    statusReads.delete(uploadId)
  }
}
