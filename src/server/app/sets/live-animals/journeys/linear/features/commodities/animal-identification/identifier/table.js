import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import {
  PERMANENT_ADDRESS,
  permanentAddressApplies,
  scopedFields
} from './fields.js'

const copy = copyFor({ en, cy }).identification

export const IDENTIFIER_LABELS = copy.identifierLabels

export const identifierColumns = (commodityCode, speciesLatinName) => [
  ...scopedFields(commodityCode).map((field) => [
    field.id,
    IDENTIFIER_LABELS[field.id]
  ]),
  ...(permanentAddressApplies(commodityCode, speciesLatinName)
    ? [[PERMANENT_ADDRESS, copy.table.permanentAddressColumn]]
    : [])
]

export const identifierCellText = (unit, id) =>
  (id === PERMANENT_ADDRESS ? unit.permanentAddress?.name : unit[id]) ?? ''
