import { obligationByName } from '../model/obligations/manifest.js'
import { admitsValue } from '../model/obligations/helper-internals.js'

/**
 * Whether the named obligation applies for a gate value; an obligation with
 * no gate never does. For an obligation whose gate declares a paired
 * obligation, `pairedValue` is paired with `gateValue` before the gate is
 * read; for any other obligation `pairedValue` is ignored.
 *
 * @param {string} obligationName - the obligation's manifest name.
 * @param {string} gateValue - the value the obligation's gate reads.
 * @param {string} [pairedValue] - the paired obligation's value, for a gate
 *   that reads a `[gate value, paired value]` pair.
 * @returns {boolean}
 */
export const appliesForGateValue = (obligationName, gateValue, pairedValue) => {
  const metadata = obligationByName(obligationName)?.applyTo?.metadata
  const value = metadata?.pairedObligationId
    ? [gateValue, pairedValue]
    : gateValue
  return admitsValue(metadata, value)
}

/**
 * The manifest's cap on the documents collection.
 *
 * @returns {number}
 */
export const maxDocuments = () =>
  obligationByName('documents').requires.maxEntries
