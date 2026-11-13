import { compose, maxText } from '../../../../../../../../lib/validate/index.js'
import { appliesForGateValue } from '../../../../../../../../bridge/applicability.js'
import * as commodities from '../../../../../../services/commodities/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { fieldName } from '../fields.js'

const copy = copyFor({ en, cy }).identification

const IDENTIFIER_MAX_MESSAGES = copy.errors.identifierMax

export const scopedFields = (commodityCode, speciesLatinName) => {
  const fallbackIdentifierFields = ['identificationDetails', 'description']
  return [
    ...commodities.identifiersFor(commodityCode),
    ...fallbackIdentifierFields
  ]
    .filter((id) => appliesForGateValue(id, commodityCode, speciesLatinName))
    .map((id) => ({ id, label: copy.identifierLabels[id] }))
}

export const hasAnIdentifierField = (commodityCode, speciesLatinName) =>
  scopedFields(commodityCode, speciesLatinName).length > 0

export const identifierChecksFor = (commodityCode, speciesLatinName, index) => {
  const IDENTIFIER_MAX_LENGTH = 58
  return compose(
    ...scopedFields(commodityCode, speciesLatinName).map((field) =>
      maxText(
        fieldName(field.id, index),
        IDENTIFIER_MAX_LENGTH,
        IDENTIFIER_MAX_MESSAGES[field.id]
      )
    )
  )
}

export const identifierValuesFromPayload = (
  payload,
  commodityCode,
  speciesLatinName,
  index
) =>
  Object.fromEntries(
    scopedFields(commodityCode, speciesLatinName).map((field) => [
      field.id,
      (payload[fieldName(field.id, index)] ?? '').trim()
    ])
  )

export const blankValuesFor = (commodityCode, speciesLatinName) =>
  Object.fromEntries(
    scopedFields(commodityCode, speciesLatinName).map((field) => [field.id, ''])
  )
