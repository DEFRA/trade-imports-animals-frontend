/**
 * Deterministic quote reference, spike-a parity (lib/quote.js:82-84):
 * 'CI-' + the journeyId's first 6 hex characters, uppercased — so a
 * re-submit re-stamps the identical reference.
 */
export function makeReference(journeyId) {
  return `CI-${journeyId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}
