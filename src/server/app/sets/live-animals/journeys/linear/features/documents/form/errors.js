import { isBlank } from '../../../../../../../lib/answered.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import {
  FILE_TYPE_MESSAGE,
  OVERSIZE_FILE_MESSAGE,
  attachmentTypeFor,
  exceedsMaxFileSize
} from '../upload-config.js'
import { fields } from './payload.js'

const copy = copyFor({ en, cy })

// Every document field is mandatory per record and there is no edit
// page — a record added with blanks could never be completed in place,
// so presence is enforced at add time.
export const presenceErrors = (entry) => ({
  ...(entry.accompanyingDocumentReference
    ? {}
    : { accompanyingDocumentReference: copy.errors.referenceRequired }),
  ...(isBlank(entry.accompanyingDocumentDateOfIssue)
    ? { accompanyingDocumentDateOfIssue: copy.errors.dateRequired }
    : {})
})

export const fileErrors = (file) => {
  if (!file?.payload?.length) {
    return { file: copy.errors.fileRequired }
  }
  if (exceedsMaxFileSize(file.payload.length)) {
    return { file: OVERSIZE_FILE_MESSAGE }
  }
  if (!attachmentTypeFor(file.filename ?? '')) {
    return { file: FILE_TYPE_MESSAGE }
  }
  return {}
}

export const documentAddErrors = (payload, bare, pendingDocumentSave) => {
  const { errors } = validate(fields, payload)
  return {
    ...errors,
    ...presenceErrors(bare),
    ...(pendingDocumentSave ? {} : fileErrors(payload.file))
  }
}

export const capacityExceededError = () => [
  {
    text: copy.errors.maxDocuments(MAX_DOCUMENTS),
    href: DOCUMENTS_ADDED_ANCHOR
  }
]
