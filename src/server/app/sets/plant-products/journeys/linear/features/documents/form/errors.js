import { isBlank } from '../../../../../../../lib/answered.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import {
  FILE_TYPE_MESSAGE,
  OVERSIZE_FILE_MESSAGE,
  exceedsMaxFileSize,
  isAllowedFilename
} from '../upload-config.js'
import { fields } from './payload.js'

const copy = copyFor({ en, cy })

export const presenceErrors = (entry) => ({
  ...(entry.documentReference
    ? {}
    : { documentReference: copy.errors.referenceRequired }),
  ...(isBlank(entry.issueDate) ? { issueDate: copy.errors.dateRequired } : {})
})

// The file is optional, so an absent part is not an error. Every rule below
// only judges a file the user actually chose.
export const hasFilePart = (file) =>
  Boolean(file?.filename) || Boolean(file?.payload?.length)

export const fileErrors = (file) => {
  if (!hasFilePart(file)) {
    return {}
  }
  if (!isAllowedFilename(file.filename ?? '')) {
    return { file: FILE_TYPE_MESSAGE }
  }
  if (!file.payload?.length) {
    return { file: copy.errors.fileEmpty }
  }
  if (exceedsMaxFileSize(file.payload.length)) {
    return { file: OVERSIZE_FILE_MESSAGE }
  }
  return {}
}

export const documentAddErrors = (payload, entry, claimedUpload) => {
  const { errors = {} } = validate(fields, payload)
  return {
    ...errors,
    ...presenceErrors(entry),
    ...(claimedUpload ? {} : fileErrors(payload.file))
  }
}

export const isAtCapacity = (documents) => documents.length >= MAX_DOCUMENTS

export const capacityExceededError = () => [
  {
    text: copy.errors.maxDocuments(MAX_DOCUMENTS),
    href: DOCUMENTS_ADDED_ANCHOR
  }
]
