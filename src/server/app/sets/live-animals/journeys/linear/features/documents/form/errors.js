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

// The error summary lists the fields in the order it is handed them, and the
// summary has to read down the page. Presence and format rules fire in their
// own order, so the merged result is rebuilt in the page's order.
const FIELD_ORDER = [
  'accompanyingDocumentReference',
  'accompanyingDocumentType',
  'accompanyingDocumentDateOfIssue',
  'file'
]

const inFieldOrder = (errors) =>
  Object.fromEntries(
    FIELD_ORDER.filter((field) => errors[field]).map((field) => [
      field,
      errors[field]
    ])
  )

export const documentAddErrors = (payload, bare, pendingDocumentSave) => {
  const { errors } = validate(fields(), payload)
  return inFieldOrder({
    ...errors,
    ...presenceErrors(bare),
    ...(pendingDocumentSave ? {} : fileErrors(payload.file))
  })
}

export const capacityExceededError = () => [
  {
    text: copy.errors.maxDocuments(MAX_DOCUMENTS),
    href: DOCUMENTS_ADDED_ANCHOR
  }
]
