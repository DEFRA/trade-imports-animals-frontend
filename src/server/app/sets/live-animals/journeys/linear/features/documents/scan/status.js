import { documentUploads } from '../../../../../../../services/document-uploads/index.js'
import { SCAN_STATUS } from '../scan-poll.js'
import { tagKeyFor } from '../view-model/fragments/status.js'

export const scanStatusOf = async (entry, { refresh, request }) => {
  if (!entry.uploadId) {
    return { scanStatus: SCAN_STATUS.COMPLETE }
  }
  try {
    const { scanStatus, rejectionReason } = await documentUploads.scanStatus({
      uploadId: entry.uploadId,
      filename: entry.filename,
      refresh
    })
    return { scanStatus, rejectionReason }
  } catch (err) {
    request.logger.warn(
      {
        err,
        status: err.status,
        journeyId: request.params.journeyId,
        uploadId: entry.uploadId
      },
      'Could not read the document scan status, treating it as pending'
    )
    return { scanStatus: SCAN_STATUS.PENDING }
  }
}

export const withScanStatus = (documents, { refresh, request }) =>
  Promise.all(
    documents.map(async (item) => ({
      ...item,
      ...(await scanStatusOf(item.entry, { refresh, request }))
    }))
  )

export const scanned = (documents) =>
  documents
    .filter(({ entry }) => entry.uploadId)
    .map((item) => ({
      uploadId: item.entry.uploadId,
      scanStatus: item.scanStatus,
      tagKey: tagKeyFor(item)
    }))

const isNotClearedByScan = (item) => item.scanStatus !== SCAN_STATUS.COMPLETE

export const hasDocumentsNotClearedByScan = (documents) =>
  documents.some(isNotClearedByScan)

export const scansNotCleared = (documents) =>
  scanned(documents.filter(isNotClearedByScan))
