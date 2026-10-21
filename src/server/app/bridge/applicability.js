import { obligationByName } from '../model/obligations/manifest.js'

const COMPLEMENT_GATE_TYPES = new Set(['notInUnionOf', 'anyNotInUnionOf'])

/**
 * Whether a gate admits a value: a complement gate admits what its list
 * leaves out, every other gate admits what its list holds.
 *
 * @param {object} [metadata] - the gate's `applyTo.metadata`.
 * @param {*} value - the stored value of the gate obligation.
 * @returns {boolean}
 */
export const gateAdmits = (metadata, value) => {
  const inList = (metadata?.values ?? []).includes(value)
  return COMPLEMENT_GATE_TYPES.has(metadata?.gateType) ? !inList : inList
}

/**
 * Whether the named obligation applies for a gate value; an obligation with
 * no gate never does.
 *
 * @param {string} obligationName - the obligation's manifest name.
 * @param {string} gateValue - the value the obligation's gate reads.
 * @returns {boolean}
 */
export const appliesForGateValue = (obligationName, gateValue) =>
  gateAdmits(obligationByName(obligationName)?.applyTo?.metadata, gateValue)

/**
 * The manifest's cap on the documents collection.
 *
 * @returns {number}
 */
export const maxDocuments = () =>
  obligationByName('documents').requires.maxEntries
