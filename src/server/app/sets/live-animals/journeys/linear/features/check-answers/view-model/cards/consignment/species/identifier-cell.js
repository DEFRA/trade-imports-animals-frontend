import { PERMANENT_ADDRESS } from '../../../../../commodities/animal-identification/identifier/fields.js'
import { valueText } from '../../../rows/value-text.js'

export const identifierCell = (unit, id) =>
  id === PERMANENT_ADDRESS
    ? valueText(unit[PERMANENT_ADDRESS]?.name)
    : valueText(unit[id])
