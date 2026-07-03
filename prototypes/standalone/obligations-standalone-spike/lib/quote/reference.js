/**
 * Deterministic quote reference, spike-a parity (lib/quote.js:82-84):
 * 'CI-' + the journeyId's first 6 hex characters, uppercased — so a
 * re-submit re-stamps the identical reference.
 */
const REFERENCE_HEX_LENGTH = 6

export const makeReference = (journeyId) =>
  `CI-${journeyId.replace(/-/g, '').slice(0, REFERENCE_HEX_LENGTH).toUpperCase()}`
