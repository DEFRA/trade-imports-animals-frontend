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
