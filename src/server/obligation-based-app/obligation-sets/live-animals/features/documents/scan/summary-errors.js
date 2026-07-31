import { copyFor } from '../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { SCAN_STATUS } from '../scan-poll.js'

const copy = copyFor({ en, cy })

const CANNOT_CONTINUE_MESSAGE = copy.errors.cannotContinue

export const rejectedErrors = (documents) =>
  documents
    .filter((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    .map((item) => ({
      text: copy.errors.virusFound(
        item.entry.filename ?? copy.errors.fileFallbackName
      ),
      href: DOCUMENTS_ADDED_ANCHOR
    }))

export const settlingSummaryErrors = (documents) =>
  documents.some((item) => item.scanStatus === SCAN_STATUS.REJECTED)
    ? []
    : [{ text: CANNOT_CONTINUE_MESSAGE, href: DOCUMENTS_ADDED_ANCHOR }]
