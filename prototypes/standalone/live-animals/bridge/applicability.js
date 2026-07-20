/**
 * State-free commodity applicability — "does obligation X apply to
 * commodity NAME C?".
 *
 * Answers the question a page must ask BEFORE any record exists (which
 * identifier fields to render for a picked commodity, which CYA rows a
 * line's commodity earns), so runtime scope (`makeScope`) cannot answer
 * it. Sourced from the manifest's gate metadata: the commodity-gated
 * helpers expose their allowlist on `applyTo.metadata.values` as CN
 * codes; the stored commodity is the picker NAME, translated through the
 * commodities service — the same translation the write path applies.
 *
 * `notInUnionOf` gates (the free-text identifiers) are complements: they
 * apply exactly when the commodity is NOT in the derived union, including
 * a commodity the service cannot code (no CN code → not in any list).
 * Every other shape applies when the commodity's code is in the list; an
 * obligation with no commodity gate never applies here.
 */

import { obligations } from '../model/obligations/obligations.js'
import { commodityCodeFor } from '../services/commodities/index.js'

const obligationByName = new Map(
  obligations.map((obligation) => [obligation.name, obligation])
)

/**
 * Whether the named obligation applies to a commodity, judged from the
 * manifest's gate metadata alone (no journey state).
 *
 * @param {string} obligationName - the obligation's manifest name.
 * @param {string} commodityName - the picker commodity name (e.g. 'Cow').
 * @returns {boolean}
 */
export const appliesForCommodity = (obligationName, commodityName) => {
  const metadata = obligationByName.get(obligationName)?.applyTo?.metadata
  const values = metadata?.values ?? []
  const inList = values.includes(commodityCodeFor(commodityName))
  return metadata?.type === 'notInUnionOf' ? !inList : inList
}
