import { isBlank } from '../../../../../../../lib/answered.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import {
  FILE_TYPE_MESSAGE,
  OVERSIZE_FILE_MESSAGE,
  attachmentTypeFor,
  exceedsMaxFileSize
} from '../upload-config.js'
import { fields } from './payload.js'

const copy = copyFor({ en, cy })

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

export const capacityExceededFieldErrors = () => ({
  file: copy.errors.maxDocuments(MAX_DOCUMENTS)
})
