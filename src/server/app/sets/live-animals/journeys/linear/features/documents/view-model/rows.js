import { pagePath } from '../../../../../../../shared/paths.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { removeButton } from '../contracts/remove-action.js'
import { documentsPage as page } from '../page.js'
import { SCAN_STATUS } from '../scan-poll.js'
import { statusTagHtml } from './fragments/status.js'
import { cellText, dateText } from './fragments/text.js'

const copy = copyFor({ en, cy })

export const filePath = (journeyId, uploadId) =>
  pagePath(journeyId, `${page.slug}/${uploadId}/file`)

export const viewFileLink = (entry, index, journeyId) =>
  `<a class="govuk-link govuk-!-margin-right-3" href="${filePath(journeyId, entry.uploadId)}">` +
  `${copy.viewFile}<span class="govuk-visually-hidden"> ${copy.viewFileHidden(index + 1)}</span></a>`

export const isViewable = (entry, scanStatus) =>
  Boolean(entry.uploadId) && scanStatus === SCAN_STATUS.COMPLETE

export const actionsCell = ({ entry, index, scanStatus, journeyId }) => ({
  html: isViewable(entry, scanStatus)
    ? `${viewFileLink(entry, index, journeyId)}${removeButton(index)}`
    : removeButton(index),
  format: 'numeric',
  attributes: {
    'data-view-file-text': copy.viewFile,
    'data-view-file-hidden': copy.viewFileHidden(index + 1)
  }
})

export const statusCell = (entry, scanStatus) => ({
  html: statusTagHtml(
    scanStatus,
    cellText(entry.accompanyingDocumentReference)
  ),
  attributes: entry.uploadId
    ? { 'data-upload-id': entry.uploadId, 'data-scan-status': scanStatus }
    : undefined
})

export const documentRows = (documents, journeyId) =>
  documents.map(({ index, entry, scanStatus }) => [
    {
      text: cellText(entry.accompanyingDocumentReference),
      classes: 'app-table__cell--break-anywhere'
    },
    { text: cellText(copy.types[entry.accompanyingDocumentType]) },
    { text: dateText(entry.accompanyingDocumentDateOfIssue) },
    statusCell(entry, scanStatus),
    actionsCell({ entry, index, scanStatus, journeyId })
  ])
