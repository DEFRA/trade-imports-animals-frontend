/**
 * Driving history — the obligation defs this feature owns. Pure data; imports
 * nothing outward.
 *
 * `hadClaims` is the controlling answer that activates the `claims` collection
 * (owned by the claims feature). That relationship is declared on the claims
 * def, not here — this feature merely owns the answer. The reference graph is
 * a shared DAG threaded through the slices: `claims/obligations.js` imports
 * `hadClaims` from here.
 */
export const yearsNoClaims = { id: 'yearsNoClaims' }
export const hadClaims = { id: 'hadClaims', required: true }
export const penaltyPoints = { id: 'penaltyPoints' }

export const defs = [yearsNoClaims, hadClaims, penaltyPoints]
