import { compose, maxText } from '../../../../lib/validate/index.js'
import { appliesForCommodity } from '../../../../bridge/applicability.js'
import { copyFor } from '../../../../shared/copy.js'
import { copy as en } from '../../copy.en.js'
import { copy as cy } from '../../copy.cy.js'
import { fieldName } from '../fields.js'

const copy = copyFor({ en, cy }).identification

const toFields = (byId) =>
  Object.entries(byId).map(([id, field]) => ({ id, ...field }))

const TYPE_FIELDS = toFields(copy.typeFields)

const FALLBACK_FIELDS = toFields(copy.fallbackFields)

const IDENTIFIER_MAX_MESSAGES = copy.errors.identifierMax

const scopedTypeFields = (commodity) =>
  TYPE_FIELDS.filter((field) => appliesForCommodity(field.id, commodity))

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
      maxText(fieldName(field.id, index), 58, IDENTIFIER_MAX_MESSAGES[field.id])
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
