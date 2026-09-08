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
 * `notInUnionOf` gates are complements: they apply exactly when the
 * commodity is NOT in the derived union. Every other shape applies when
 * the commodity is in the list; an obligation with no commodity gate never
 * applies here, so a commodity on none of the identifier allowlists is
 * asked for no identifier at all.
 */

import { obligationByName } from '../model/obligations/manifest.js'

/**
 * Whether an allow-list gate's metadata admits a stored value. The
 * complement shape (`notInUnionOf`) admits everything the derived union
 * leaves out; every other shape admits what its list holds.
 *
 * @param {object} [metadata] - the gate's `applyTo.metadata`.
 * @param {*} value - the stored value of the gate obligation.
 * @returns {boolean}
 */
export const gateAdmits = (metadata, value) => {
  const inList = (metadata?.values ?? []).includes(value)
  return metadata?.gateType === 'notInUnionOf' ? !inList : inList
}

/**
 * Whether the named obligation applies to a commodity, judged from the
 * manifest's gate metadata alone (no journey state).
 *
 * @param {string} obligationName - the obligation's manifest name.
 * @param {string} commodityName - the picker commodity name (e.g. 'Cow').
 * @returns {boolean}
 */
export const appliesForCommodity = (obligationName, commodityName) =>
  gateAdmits(obligationByName(obligationName)?.applyTo?.metadata, commodityName)

/**
 * The manifest's cap on the documents collection
 * (`documents.requires.maxEntries`) — the single source the controller
 * cap derives from.
 *
 * @returns {number}
 */
export const maxDocuments = () =>
  obligationByName('documents').requires.maxEntries
