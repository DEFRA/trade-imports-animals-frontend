import { copyFor } from '../../../../../../../shared/copy.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { SCAN_STATUS } from '../scan-poll.js'

const copy = copyFor({ en, cy })

export const rejectedErrors = (documents) =>
  documents
    .filter((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    .map((item) => ({
      text: copy.errors.virus(
        item.entry.filename ?? copy.errors.fileFallbackName
      ),
      href: DOCUMENTS_ADDED_ANCHOR
    }))

export const settlingSummaryErrors = (documents) =>
  documents.some((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    ? []
    : [{ text: copy.errors.cannotContinue, href: DOCUMENTS_ADDED_ANCHOR }]
