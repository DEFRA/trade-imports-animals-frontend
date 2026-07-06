/**
 * Gate combinators — declarative building blocks for obligation `gatedBy`.
 *
 * Constructors here are data-only. Each returns a plain tagged object; no
 * logic. The interpretation (walking the tree, resolving against stored
 * fulfilments, projecting between identity levels) lives in
 * `gate-resolver.js`. Keeping construction and interpretation separate
 * lets each be tested in isolation.
 *
 * Vocabulary in one paragraph:
 *   - Primitives read a single obligation's storage: `allowListed`,
 *     `matches`, `present`.
 *   - Compositions combine other gates: `and`, `or`, `not`.
 *   - Projections aggregate an indexed obligation's records down to a
 *     scalar decision: `any`, `every`.
 *
 * Every constructor returns `{ type: '<name>', ...meta }`. The `type`
 * discriminator is what the resolver dispatches on.
 *
 * Example (V4 passport, depth-2, commodity-gated per line):
 *
 *   gatedBy: allowListed(commodityCode, PASSPORT_COMMODITIES)
 *
 * Example (V4 CPH, notification-level aggregating across lines):
 *
 *   gatedBy: any(commodityLine, allowListed(commodityCode, CPH_REQUIRED_COMMODITIES))
 *
 * Example (V4 identificationDetails, active when no specific identifier applies):
 *
 *   gatedBy: and(
 *     not(allowListed(commodityCode, PASSPORT_COMMODITIES)),
 *     not(allowListed(commodityCode, TATTOO_COMMODITIES)),
 *     not(allowListed(commodityCode, EAR_TAG_COMMODITIES)),
 *     not(allowListed(commodityCode, HORSE_NAME_COMMODITIES))
 *   )
 */

// -----------------------------------------------------------------------------
// Primitives — read one obligation's storage
// -----------------------------------------------------------------------------

/**
 * True where the obligation's stored value is in the allowlist.
 *
 * For scalar (notification-level) obligations: checks the single value
 * at `fulfilments[obligation.id]`.
 *
 * For indexed obligations: checks each stored value per composite key
 * and yields a match set at the obligation's identity level.
 */
export function allowListed(obligation, values) {
  return { type: 'allowListed', obligation, values }
}

/**
 * True where the obligation's stored value equals the given value.
 * Same identity-level semantics as `allowListed`.
 */
export function matches(obligation, value) {
  return { type: 'matches', obligation, value }
}

/**
 * True where the obligation has any stored value.
 *
 * For scalar obligations: `true` iff `fulfilments[obligation.id]` is
 * defined.
 *
 * For indexed obligations: `true` at each composite key that has a
 * stored record.
 */
export function present(obligation) {
  return { type: 'present', obligation }
}

// -----------------------------------------------------------------------------
// Compositions — combine gates
// -----------------------------------------------------------------------------

/**
 * True where every sub-gate is true.
 * Sub-gates may be at different identity levels; the resolver projects
 * them to the finest common level before combining.
 */
export function and(...gates) {
  return { type: 'and', gates }
}

/**
 * True where at least one sub-gate is true.
 * Projection semantics match `and`.
 */
export function or(...gates) {
  return { type: 'or', gates }
}

/**
 * True where the sub-gate is false.
 * Result is at the sub-gate's identity level.
 */
export function not(gate) {
  return { type: 'not', gate }
}

// -----------------------------------------------------------------------------
// Projections — aggregate an indexed obligation's records to a scalar
// -----------------------------------------------------------------------------

/**
 * Scalar true iff the sub-gate is true for at least one instance of
 * the indexed obligation.
 *
 * Use to express notification-level "does ANY record satisfy?"
 * questions — e.g. CPH:
 *
 *   any(commodityLine, allowListed(commodityCode, CPH_REQUIRED_COMMODITIES))
 *
 * Reads as: "at least one commodity line has a CPH-required code."
 */
export function any(indexedObligation, gate) {
  return { type: 'any', indexedObligation, gate }
}

/**
 * Scalar true iff the sub-gate is true for every instance of the
 * indexed obligation.
 *
 * Use for "does EVERY record satisfy?" — rare but symmetric with `any`.
 */
export function every(indexedObligation, gate) {
  return { type: 'every', indexedObligation, gate }
}
