import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import { SCAN_STATUS } from '../scan-poll.js'

export const scanStatusOf = async (entry, { refresh, request }) => {
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
    request.logger.warn(
      { journeyId: request.params.journeyId, uploadId: entry.uploadId, err },
      'Scan status unavailable: upload service call failed, document shown as pending'
    )
    return SCAN_STATUS.PENDING
  }
}

export const withScanStatus = (documents, { refresh, request }) =>
  Promise.all(
    documents.map(async (item) => ({
      ...item,
      scanStatus: await scanStatusOf(item.entry, { refresh, request })
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
