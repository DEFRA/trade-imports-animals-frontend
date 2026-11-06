import { escapeAndBoldMatches } from '../../../../../../../../../../client/common/helpers/bold-matches.js'
import { speciesLabel } from '../../species-label.js'
import { legendFor } from '../../commodity-legend.js'

export const legendHtmlFor = (commodityCode, query) =>
  escapeAndBoldMatches(legendFor(commodityCode), query)

export const speciesLabelHtml = (row, query) =>
  escapeAndBoldMatches(speciesLabel(row), query)
