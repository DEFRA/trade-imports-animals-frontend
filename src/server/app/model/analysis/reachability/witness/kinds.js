/**
 * The classification `synthesiseWitness` returns for a gate.
 *
 * - `'witness'` - a value that opens the gate: `{ kind, obligationId, value }`.
 * - `'trivial'` - the gate is always open: `{ kind }`.
 * - `'opaque'` - the metadata names no value to write: `{ kind, reason }`.
 */
export const WITNESS_KIND = Object.freeze({
  WITNESS: 'witness',
  TRIVIAL: 'trivial',
  OPAQUE: 'opaque'
})

/**
 * The `.metadata.gateType` labels of helpers whose gates can be inverted into a
 * witness.
 */
export const STRUCTURED_HELPER_TYPES = new Set([
  'allowListed',
  'allowListedPairs',
  'anyAllowListed',
  'anyNotInUnionOf',
  'matches',
  'branchedGate',
  'notInUnionOf',
  'equalsGate',
  'presentGate',
  'includesGate',
  'alwaysInScope'
])

/**
 * The `.metadata.gateType` labels of helpers that cannot be inverted into a
 * witness.
 */
export const OPAQUE_HELPER_TYPES = new Set([])
