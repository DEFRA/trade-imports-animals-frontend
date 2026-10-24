import { compose, maxText } from '../../../../../../../../lib/validate/index.js'
import { appliesForGateValue } from '../../../../../../../../bridge/applicability.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { fieldName } from '../fields.js'

const copy = copyFor({ en, cy }).identification

const IDENTIFIER_MAX_MESSAGES = copy.errors.identifierMax

export const scopedFields = (commodityCode) =>
  commodities
    .identifiersFor(commodityCode)
    .filter((id) => appliesForGateValue(id, commodityCode))
    .map((id) => ({ id, ...copy.typeFields[id] }))

export const PERMANENT_ADDRESS = 'permanentAddress'

export const permanentAddressApplies = (commodityCode, speciesLatinName) =>
  appliesForGateValue(PERMANENT_ADDRESS, [commodityCode, speciesLatinName])

export const identifierChecksFor = (commodityCode, index) => {
  const IDENTIFIER_MAX_LENGTH = 58
  return compose(
    ...scopedFields(commodityCode).map((field) =>
      maxText(
        fieldName(field.id, index),
        IDENTIFIER_MAX_LENGTH,
        IDENTIFIER_MAX_MESSAGES[field.id]
      )
    )
  )
}

export const identifierValuesFromPayload = (payload, commodityCode, index) =>
  Object.fromEntries(
    scopedFields(commodityCode).map((field) => [
      field.id,
      (payload[fieldName(field.id, index)] ?? '').trim()
    ])
  )

export const blankValuesFor = (commodityCode) =>
  Object.fromEntries(scopedFields(commodityCode).map((field) => [field.id, '']))
