import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { isRejectedByScan } from './status.js'

const copy = copyFor({ en, cy })

export const rejectedErrors = (documents) =>
  documents.filter(isRejectedByScan).map((item) => ({
    text: copy.errors.rejected(
      item.entry.filename ?? copy.errors.fileFallbackName
    ),
    href: DOCUMENTS_ADDED_ANCHOR
  }))
