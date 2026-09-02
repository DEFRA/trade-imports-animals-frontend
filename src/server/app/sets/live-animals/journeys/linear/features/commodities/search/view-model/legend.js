import * as commodities from '../../../../../../services/commodities/index.js'

/** How a commodity is titled wherever it is shown on this page — the results
 * fieldset legends and the chosen-species panel must not drift apart. */
export const legendFor = (name) =>
  `${name} (${commodities.commodityCodeFor(name)})`
