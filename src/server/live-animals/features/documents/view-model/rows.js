import { pagePath } from '../../../config.js'
import { copyFor } from '../../../shared/copy.js'
import { copy as en } from '../copy.en.js'
import { copy as cy } from '../copy.cy.js'
import { removeButton } from '../contracts/remove-action.js'
import { documentsPage as page } from '../page.js'
import { SCAN_STATUS } from '../scan-poll.js'
import { statusTagHtml } from './fragments/status.js'
import { cellText, dateText } from './fragments/text.js'

const copy = copyFor({ en, cy })

export const filePath = (journeyId, uploadId) =>
  pagePath(journeyId, `${page.slug}/${uploadId}/file`)

// Reading the file back is a read, so it is a link, not a submit — it needs
// no crumb and the form's client-side submit handling never sees it.
export const viewFileLink = (entry, index, journeyId) =>
  `<a class="govuk-link govuk-!-margin-right-3" href="${filePath(journeyId, entry.uploadId)}">` +
  `${copy.viewFile}<span class="govuk-visually-hidden"> ${copy.viewFileHidden(index + 1)}</span></a>`

// A file is only offered once its scan has settled clean — a pending or
// virus-bearing upload has nothing safe to open.
export const isViewable = (entry, scanStatus) =>
  Boolean(entry.uploadId) && scanStatus === SCAN_STATUS.COMPLETE

export const actionsCell = ({ entry, index, scanStatus, journeyId }) => ({
  html: isViewable(entry, scanStatus)
    ? `${viewFileLink(entry, index, journeyId)}${removeButton(index)}`
    : removeButton(index),
  attributes: {
    'data-view-file-text': copy.viewFile,
    'data-view-file-hidden': copy.viewFileHidden(index + 1)
  }
})

// The scan-status cell carries the polling contract: the client rewrites the
// tag it holds in place, keyed by upload id.
export const statusCell = (entry, scanStatus) => ({
  html: statusTagHtml(scanStatus),
  attributes: entry.uploadId
    ? { 'data-upload-id': entry.uploadId, 'data-scan-status': scanStatus }
    : undefined
})

export const documentRows = (documents, journeyId) =>
  documents.map(({ index, entry, scanStatus }) => [
    { text: cellText(entry.accompanyingDocumentReference) },
    { text: cellText(copy.types[entry.accompanyingDocumentType]) },
    { text: dateText(entry.accompanyingDocumentDateOfIssue) },
    statusCell(entry, scanStatus),
    actionsCell({ entry, index, scanStatus, journeyId })
  ])
