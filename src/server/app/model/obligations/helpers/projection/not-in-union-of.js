import { deriveUnion } from './internals/derive-union.js'
import { buildProjectionGate } from './internals/build-projection-gate.js'

/**
 * notInUnionOf — dual of `allowListed`. Obligation is in scope on
 * entries whose `gateObligation` stored value is NOT in the union of
 * the given allowlists. The derived union is computed when the gate
 * runs and exposed on `.metadata.values` so static analysis (witness
 * synthesiser, browser-side controllers) can inspect "would this value
 * be admitted?" without executing the closure.
 *
 * Two input shapes accepted:
 *   - `[[a, b], [c, d]]` — a list of allowlists (typical case:
 *     `notInUnionOf(commodityCode, [passportCommodities(),
 *     tattooCommodities(), earTagCommodities(), horseNameCommodities()],
 *     unitRecord, reasons)`). The union is set-like — duplicates across
 *     allowlists collapse.
 *   - `[a, b, c]` — a flat list of values (single-allowlist complement).
 *     Ergonomic shorthand; the derived union is just the input.
 *
 * Rationale — `notInUnionOf` as a derived-union helper over
 * `.metadata.values` is STRICTLY better than a hand-restated
 * four-whitelist complement expressed as an opaque JS predicate: adding
 * a fifth typed identifier to one of the source allowlists widens the
 * derived union automatically; a hand-restated complement would
 * silently double-gate if the author forgot to add a fifth
 * `!X.includes(code)` conjunct.
 *
 * Shares the outer factory in `internals/build-projection-gate.js`
 * with `allowListed`. Only the predicate direction (not-in-union vs
 * in-list), the values source (derived union vs plain list), and the
 * metadata `type` string differ.
 */
export const notInUnionOf = (
  gateObligation,
  unionOfAllowlists,
  projectionGroup,
  reasons
) => {
  const currentValues = () =>
    deriveUnion(
      typeof unionOfAllowlists === 'function'
        ? unionOfAllowlists()
        : unionOfAllowlists
    )
  return buildProjectionGate({
    type: 'notInUnionOf',
    gateObligation,
    currentValues,
    admits: (value) => !currentValues().includes(value),
    projectionGroup,
    reasons
  })
}
