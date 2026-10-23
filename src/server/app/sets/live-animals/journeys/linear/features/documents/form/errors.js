import { isBlank } from '../../../../../../../lib/answered.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import {
  FILE_DOWNLOAD_FAILED,
  FILE_EMPTY,
  FILE_INVALID_TYPE,
  FILE_TOO_LARGE,
  FILE_UPLOAD_FAILED,
  FILE_VIRUS
} from '../../../../../../../services/cdp-uploader/file-error-codes.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { ADD_DOCUMENT_ANCHOR } from '../contracts/add-document-anchor.js'
import { DOCUMENTS_ADDED_ANCHOR } from '../contracts/documents-added-anchor.js'
import { MAX_DOCUMENTS } from '../contracts/max-documents.js'
import { fileTypeMessage, oversizeMessage } from '../upload-config.js'
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

export const MESSAGE_BY_FILE_ERROR_CODE = {
  [FILE_VIRUS]: copy.errors.fileVirus,
  [FILE_EMPTY]: copy.errors.fileEmpty,
  [FILE_TOO_LARGE]: oversizeMessage(copy),
  [FILE_INVALID_TYPE]: fileTypeMessage(copy),
  [FILE_UPLOAD_FAILED]: copy.errors.uploadFailed,
  [FILE_DOWNLOAD_FAILED]: copy.errors.fileDownloadFailed
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
 * The file's own name resolves to no attachment type the service accepts. Worded here rather
 * than at the call site so every file message comes from one copy deck.
 *
 * @returns {object} a file error to merge with the field rules
 */
export const fileTypeFieldError = () => ({ file: fileTypeMessage(copy) })

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
