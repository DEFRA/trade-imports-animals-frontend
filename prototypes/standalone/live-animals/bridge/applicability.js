/**
 * State-free commodity applicability — "does obligation X apply to
 * commodity NAME C?".
 *
 * Answers the question a page must ask BEFORE any record exists (which
 * identifier fields to render for a picked commodity, which CYA rows a
 * line's commodity earns), so runtime scope (`makeScope`) cannot answer
 * it. Sourced from the manifest's gate metadata: the commodity-gated
 * helpers expose their allowlist on `applyTo.metadata.values` in the
 * stored picker-name vocabulary, so the stored commodity compares
 * directly.
 *
 * `notInUnionOf` gates (the free-text identifiers) are complements: they
 * apply exactly when the commodity is NOT in the derived union. Every
 * other shape applies when the commodity is in the list; an obligation
 * with no commodity gate never applies here.
 */

import { obligations } from '../model/obligations/obligations.js'

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
  const inList = values.includes(commodityName)
  return metadata?.type === 'notInUnionOf' ? !inList : inList
}

/**
 * The manifest's cap on the documents collection
 * (`documents.requires.maxEntries`) — the single source the controller
 * cap derives from.
 *
 * @returns {number}
 */
export const maxDocuments = () =>
  obligationByName.get('documents').requires.maxEntries
