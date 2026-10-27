import { obligationByName } from '../model/obligations/manifest.js'
import { admitsValue } from '../model/obligations/helper-internals.js'

/**
 * Whether the named obligation applies for a gate value; an obligation with
 * no gate never does.
 *
 * @param {string} obligationName - the obligation's manifest name.
 * @param {string | string[]} gateValue - the value the obligation's gate
 *   reads, or for a pair gate the `[gate value, paired value]` pair.
 * @returns {boolean}
 */
export const appliesForGateValue = (obligationName, gateValue) =>
  admitsValue(obligationByName(obligationName)?.applyTo?.metadata, gateValue)

/**
 * The manifest's cap on the documents collection.
 *
 * @returns {number}
 */
export const maxDocuments = () =>
  obligationByName('documents').requires.maxEntries
