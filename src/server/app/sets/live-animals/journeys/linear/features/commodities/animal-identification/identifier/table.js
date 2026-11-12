import { scopedFields } from './fields.js'

export const identifierColumns = (commodityCode, speciesLatinName) =>
  scopedFields(commodityCode, speciesLatinName).map((field) => [
    field.id,
    field.label
  ])

export const identifierCellText = (unit, id) => unit[id] ?? ''
