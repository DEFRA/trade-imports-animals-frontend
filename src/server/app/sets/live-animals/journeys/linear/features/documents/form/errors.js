import { isBlank } from '../../../../../../../lib/answered.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import {
  FILE_EMPTY,
  FILE_INVALID_TYPE,
  FILE_TOO_LARGE
} from '../../../../../../../services/cdp-uploader/file-error-codes.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { ADD_DOCUMENT_ANCHOR } from '../contracts/add-document-anchor.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { FILE_TYPE_MESSAGE, OVERSIZE_FILE_MESSAGE } from '../upload-config.js'
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

const MESSAGE_BY_FILE_ERROR_CODE = {
  [FILE_EMPTY]: copy.errors.fileEmpty,
  [FILE_TOO_LARGE]: OVERSIZE_FILE_MESSAGE,
  [FILE_INVALID_TYPE]: FILE_TYPE_MESSAGE
}

/**
 * What to tell the trader about the file they submitted.
 *
 * @param {object} [file] - the file entry the upload service returned
 * @returns {object} a file error to render, empty when the file can be taken on
 */
export const submittedFileError = (file) => {
  if (!file?.filename) {
    return { file: copy.errors.fileRequired }
  }
  if (file.hasError) {
    return {
      file:
        MESSAGE_BY_FILE_ERROR_CODE[file.errorCode] ?? copy.errors.uploadFailed
    }
  }
  if (file.contentLength === 0) {
    return { file: copy.errors.fileEmpty }
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

export const documentAddErrors = (payload, bare, fileError) => {
  const { errors } = validate(fields(), payload)
  return inFieldOrder({ ...errors, ...presenceErrors(bare), ...fileError })
}

export const capacityExceededError = () => [
  {
    text: copy.errors.maxDocuments(MAX_DOCUMENTS),
    href: DOCUMENTS_ADDED_ANCHOR
  }
]

/**
 * The add step itself is what is outstanding. Returned as an error on the file field rather than
 * as a summary line of its own, so the summary entry leads to a control that says what is wrong —
 * the file input takes its message from the field errors, so a summary-only entry pointed a
 * trader at an input with nothing on it.
 *
 * @returns {object} a file error to merge with the field rules
 */
export const notYetAddedFileError = () => ({ file: copy.errors.notYetAdded })

export const uploadUnavailableError = () => [
  { text: copy.errors.uploadUnavailable, href: ADD_DOCUMENT_ANCHOR }
]
