/**
 * State-free commodity applicability — "does obligation X apply to a line
 * whose gate value is V?".
 *
 * Answers the question a page must ask BEFORE any record exists (which
 * identifier fields to render for a picked commodity, which CYA rows a
 * line's commodity earns), so runtime scope (`makeScope`) cannot answer
 * it. Sourced from the manifest's gate metadata: the gated helpers expose
 * their allowlist on `applyTo.metadata.values` in the vocabulary the gate
 * obligation stores, so the stored value compares directly. The caller
 * passes the value the gate reads — a commodity code for most gates, a
 * species for a species-gated one.
 *
 * `notInUnionOf` and `anyNotInUnionOf` gates are complements: they apply
 * exactly when the value is NOT in the derived union. Every other shape
 * applies when the value is in the list; an obligation with no gate never
 * applies here, so a commodity on none of the identifier allowlists is
 * asked for no identifier at all.
 */

import { obligationByName } from '../model/obligations/manifest.js'

const COMPLEMENT_GATE_TYPES = ['notInUnionOf', 'anyNotInUnionOf']

/**
 * Whether an allow-list gate's metadata admits a stored value. The
 * complement shapes (`notInUnionOf`, `anyNotInUnionOf`) admit everything
 * the derived union leaves out; every other shape admits what its list
 * holds.
 *
 * @param {object} [metadata] - the gate's `applyTo.metadata`.
 * @param {*} value - the stored value of the gate obligation.
 * @returns {boolean}
 */
export const gateAdmits = (metadata, value) => {
  const inList = (metadata?.values ?? []).includes(value)
  return COMPLEMENT_GATE_TYPES.includes(metadata?.gateType) ? !inList : inList
}

/**
 * Whether the named obligation applies to a line, judged from the
 * manifest's gate metadata alone (no journey state).
 *
 * @param {string} obligationName - the obligation's manifest name.
 * @param {string} gateValue - the value the obligation's gate reads.
 * @returns {boolean}
 */
export const appliesForGateValue = (obligationName, gateValue) =>
  gateAdmits(obligationByName(obligationName)?.applyTo?.metadata, gateValue)

/**
 * The manifest's cap on the documents collection
 * (`documents.requires.maxEntries`) — the single source the controller
 * cap derives from.
 *
 * @returns {number}
 */
export const maxDocuments = () =>
  obligationByName('documents').requires.maxEntries
