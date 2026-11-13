import { escapeAndBoldMatches } from '../../../../../../../../../../client/common/helpers/bold-matches.js'
import { speciesLabel } from '../../species-label.js'
import { commodityLabel } from '../../commodity-label.js'

export const commodityLabelHtml = (commodityCode, query) =>
  escapeAndBoldMatches(commodityLabel(commodityCode), query)

export const speciesLabelHtml = (row, query) =>
  escapeAndBoldMatches(speciesLabel(row), query)
