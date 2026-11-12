import { isBlank } from '../../../../../../../../../../lib/answered.js'
import {
  IDENTIFIER_LABELS,
  scopedFields
} from '../../../../../commodities/animal-identification/animal-identification.controller.js'

export const filledIdentifierColumns = (
  units,
  commodityCode,
  speciesLatinName
) =>
  scopedFields(commodityCode, speciesLatinName)
    .filter(({ id }) => units.some((unit) => !isBlank(unit[id])))
    .map(({ id }) => [id, IDENTIFIER_LABELS[id]])
