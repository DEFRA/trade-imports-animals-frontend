import { compose, maxText } from '../../../../../../../../lib/validate/index.js'
import { appliesForGateValue } from '../../../../../../../../bridge/applicability.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { fieldName } from '../fields.js'

const copy = copyFor({ en, cy }).identification

const IDENTIFIER_MAX_MESSAGES = copy.errors.identifierMax

const IDENTIFIER_MAX_LENGTH = 58
export const scopedFields = (commodity) =>
  commodities
    .identifiersFor(commodity)
    .filter((id) => appliesForGateValue(id, commodity))
    .map((id) => ({ id, ...copy.typeFields[id] }))

export const PERMANENT_ADDRESS = 'permanentAddress'

export const permanentAddressApplies = (species) =>
  appliesForGateValue(PERMANENT_ADDRESS, species)

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
