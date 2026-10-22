import { createLogger } from '../../../../../../../../common/helpers/logging/logger.js'
import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import { SCAN_STATUS } from '../scan-poll.js'

const logger = createLogger()

export const scanStatusOf = async (entry, refresh) => {
  if (!entry.uploadId) {
    return SCAN_STATUS.COMPLETE
  }
  try {
    return await documentUploads.scanStatus({
      uploadId: entry.uploadId,
      filename: entry.filename,
      refresh
    })
  } catch (err) {
    logger.warn(
      { err, uploadId: entry.uploadId },
      'Scan status unavailable: upload service call failed, document shown as pending'
    )
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

const isNotClearedByScan = (item) => item.scanStatus !== SCAN_STATUS.COMPLETE

export const hasDocumentsNotClearedByScan = (documents) =>
  documents.some(isNotClearedByScan)

export const scansNotCleared = (documents) =>
  scanned(documents.filter(isNotClearedByScan))
