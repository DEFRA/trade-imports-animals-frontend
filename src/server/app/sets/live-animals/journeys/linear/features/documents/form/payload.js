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

// Built per add, not frozen at module load: the offered types are
// service-backed and the list is primed at boot. The order is the order the
// fields appear on the page, so the error summary reads down the form.
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
    // One message covers both mistakes a select can make: left on the
    // placeholder, or carrying a value the page never offered.
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

export const startsADocument = (payload) =>
  offeredDocumentTypes().includes(
    (payload.accompanyingDocumentType ?? '').trim()
  )

const answered = (value) => Boolean(String(value ?? '').trim())

export const answersADocument = (payload) =>
  startsADocument(payload) ||
  answered(payload.accompanyingDocumentType) ||
  answered(payload.accompanyingDocumentReference) ||
  Object.values(
    kit.readDate(payload, 'accompanyingDocumentDateOfIssue') ?? {}
  ).some(answered)

export const EMPTY_FORM = {
  accompanyingDocumentReference: '',
  accompanyingDocumentType: '',
  accompanyingDocumentDateOfIssue: {}
}
