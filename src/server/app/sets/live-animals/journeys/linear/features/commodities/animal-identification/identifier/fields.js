import { compose, maxText } from '../../../../../../../../lib/validate/index.js'
import { appliesForCommodity } from '../../../../../../../../bridge/applicability.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { fieldName } from '../fields.js'

const copy = copyFor({ en, cy }).identification

const toFields = (byId) =>
  Object.entries(byId).map(([id, field]) => ({ id, ...field }))

const FALLBACK_FIELDS = toFields(copy.fallbackFields)

const IDENTIFIER_MAX_MESSAGES = copy.errors.identifierMax

const IDENTIFIER_MAX_LENGTH = 58

// The commodity sets the order of its own boxes — the copy block is a lookup
// of labels and hints, not a running order (design 01-14/16/17). Applicability
// still decides whether a listed identifier renders, so the obligation model
// stays the one authority on what is in scope.
const scopedTypeFields = (commodity) =>
  commodities
    .identifiersFor(commodity)
    .filter((id) => appliesForCommodity(id, commodity))
    .map((id) => ({ id, ...copy.typeFields[id] }))

const scopedFallbackFields = (commodity) =>
  FALLBACK_FIELDS.filter((field) => appliesForCommodity(field.id, commodity))

export const scopedFields = (commodity) => [
  ...scopedTypeFields(commodity),
  ...scopedFallbackFields(commodity)
]

export const permanentAddressApplies = (commodity) =>
  appliesForCommodity('permanentAddress', commodity)

export const identifierChecksFor = (commodity, index) =>
  compose(
    ...scopedFields(commodity).map((field) =>
      maxText(
        fieldName(field.id, index),
        IDENTIFIER_MAX_LENGTH,
        IDENTIFIER_MAX_MESSAGES[field.id]
      )
    )
  )

export const identifierValuesFromPayload = (payload, commodity, index) =>
  Object.fromEntries(
    scopedFields(commodity).map((field) => [
      field.id,
      (payload[fieldName(field.id, index)] ?? '').trim()
    ])
  )

export const blankValuesFor = (commodity) =>
  Object.fromEntries(scopedFields(commodity).map((field) => [field.id, '']))
