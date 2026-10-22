import * as commodities from '../../../../../../services/commodities/index.js'
import { codeMatchRanges, wordMatchRanges } from '../matching.js'
import { emphasisParts } from './emphasis.js'

const codeOpening = (name) => `${name} (`

/** How a commodity is titled wherever it is shown on this page — the results
 * fieldset legends and the chosen-species panel must not drift apart. */
export const legendFor = (name) =>
  `${codeOpening(name)}${commodities.commodityCodeFor(name)})`

const shiftedBy = (offset) => (range) => ({
  start: range.start + offset,
  end: range.end + offset
})

export const legendPartsFor = (name, query) =>
  emphasisParts(legendFor(name), [
    ...wordMatchRanges(name, query),
    ...codeMatchRanges(commodities.commodityCodeFor(name), query).map(
      shiftedBy(codeOpening(name).length)
    )
  ])
