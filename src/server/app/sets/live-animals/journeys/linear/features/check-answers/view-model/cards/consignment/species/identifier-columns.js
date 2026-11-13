import { isBlank } from '../../../../../../../../../../lib/answered.js'
import { scopedFields } from '../../../../../commodities/animal-identification/animal-identification.controller.js'

export const filledIdentifierColumns = (
  units,
  commodityCode,
  speciesLatinName
) =>
  scopedFields(commodityCode, speciesLatinName)
    .filter(({ id }) => units.some((unit) => !isBlank(unit[id])))
    .map(({ id, label }) => [id, label])
