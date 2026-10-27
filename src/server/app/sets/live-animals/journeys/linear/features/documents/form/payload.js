import {
  compose,
  dateText,
  maxText,
  pattern,
  requiredOneOf
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import {
  REFERENCE_MAX_LENGTH,
  REFERENCE_PATTERN
} from '../../../../../../../services/document-uploads/claim-contract.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { offeredDocumentTypes } from '../contracts/document-type-options.js'

const copy = copyFor({ en, cy })

export const fields = () =>
  compose(
    maxText(
      'accompanyingDocumentReference',
      REFERENCE_MAX_LENGTH,
      copy.errors.referenceMaxLength
    ),
    pattern(
      'accompanyingDocumentReference',
      REFERENCE_PATTERN,
      copy.errors.referenceCharacters
    ),
    requiredOneOf(
      'accompanyingDocumentType',
      offeredDocumentTypes(),
      copy.errors.typeRequired
    ),
    dateText('accompanyingDocumentDateOfIssue', copy.errors.dateInvalid)
  )

export const documentFromPayload = (payload) => ({
  accompanyingDocumentReference: (
    payload.accompanyingDocumentReference ?? ''
  ).trim(),
  accompanyingDocumentType: (payload.accompanyingDocumentType ?? '').trim(),
  accompanyingDocumentDateOfIssue: kit.readDate(
    payload,
    'accompanyingDocumentDateOfIssue'
  )
})

const answered = (value) => Boolean(String(value ?? '').trim())

/**
 * Whether a submitted form has started a document: it has a reference, a type
 * (offered or not), any date of issue text, or a chosen file.
 *
 * @param {object} form - the submitted fields, with the file entry the upload
 *   service returned where the form went through it
 * @returns {boolean} whether any part of a document was given
 */
export const startsADocument = (form) =>
  answered(form.accompanyingDocumentReference) ||
  answered(form.accompanyingDocumentType) ||
  answered(form.accompanyingDocumentDateOfIssue) ||
  Boolean(form.file?.filename)

export const addsAnotherDocument = (form) => form.action === 'add'

export const EMPTY_FORM = {
  accompanyingDocumentReference: '',
  accompanyingDocumentType: '',
  accompanyingDocumentDateOfIssue: {}
}
