import { valueText } from '../../../rows/value-text.js'

export const identifierCell = (unit, id) =>
  id === 'permanentAddress'
    ? valueText(unit.permanentAddress?.name)
    : valueText(unit[id])
