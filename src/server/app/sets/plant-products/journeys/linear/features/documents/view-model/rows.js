import { pagePath } from '../../../../../../../shared/paths.js'
import { documentTypeLabel } from '../../../../../services/reference/document-types.js'
import { removeActionValue } from '../contracts/remove-action.js'
import { accompanyingDocumentsPage as page } from '../page.js'
import { SCAN_STATUS } from '../scan-poll.js'
import { statusState } from './fragments/status.js'
import { cellText, dateText } from './fragments/text.js'

// A file is only offered once its scan has settled clean — a checking, infected
// or fileless row has nothing safe to open.
const isViewable = (entry, scanStatus) =>
  Boolean(entry.uploadId) && scanStatus === SCAN_STATUS.COMPLETE

// The href comes from the shared link builder so the /plant-products mount
// prefix is never hand-written into a row.
const viewFileHref = (entry, scanStatus, journeyId) =>
  isViewable(entry, scanStatus)
    ? pagePath(journeyId, `${page.slug}/${entry.uploadId}/file`)
    : null

const documentRow = ({ index, entry, scanStatus }, journeyId) => {
  const documentType = cellText(
    documentTypeLabel(entry.documentType) ?? entry.documentType
  )
  const documentReference = cellText(entry.documentReference)
  // Both row actions carry the same context so each link and button reads
  // uniquely to a screen reader moving through the table.
  const rowContext = `${documentType} ${documentReference}`
  return {
    documentType,
    documentReference,
    issueDate: dateText(entry.issueDate),
    status: statusState(scanStatus),
    viewFileHref: viewFileHref(entry, scanStatus, journeyId),
    viewFileHidden: rowContext,
    removeAction: removeActionValue(index),
    removeHidden: rowContext
  }
}

export const documentRows = (documents, journeyId) =>
  documents.map((document) => documentRow(document, journeyId))
