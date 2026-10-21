import * as commodities from '../../../../../../../../services/commodities/index.js'

export const speciesText = (entry) =>
  entry.speciesSelection === undefined
    ? ''
    : commodities.speciesLatinName(entry.speciesSelection)
