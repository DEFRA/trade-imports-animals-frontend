import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { permanentAddressApplies, scopedFields } from './fields.js'

const copy = copyFor({ en, cy }).identification

export const IDENTIFIER_LABELS = copy.identifierLabels

const PERMANENT_ADDRESS = 'permanentAddress'

// One column per identifier the COMMODITY declares — not per identifier the
// trader happened to fill — so the header row says which identifiers this line
// expects and an empty cell shows which are still missing (design 01-16/17).
export const identifierColumns = (commodity) => [
  ...scopedFields(commodity).map((field) => [
    field.id,
    IDENTIFIER_LABELS[field.id]
  ]),
  ...(permanentAddressApplies(commodity)
    ? [[PERMANENT_ADDRESS, copy.table.permanentAddressColumn]]
    : [])
]

export const identifierCellText = (unit, id) =>
  (id === PERMANENT_ADDRESS ? unit.permanentAddress?.name : unit[id]) ?? ''
