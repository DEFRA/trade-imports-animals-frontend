/**
 * obligationMetadata — surface the introspection sidecar for an
 * obligation. Merges the gate-shape metadata attached by the applyTo
 * helper (`allowListed`, `equalsGate`, etc.) with the obligation-
 * level `dependsOn` schema key.
 *
 * Rationale — closures are opaque to a reachability prover unless
 * they declare their dependency graph as data. `dependsOn` is that
 * declaration; this accessor is the single call site the coverage
 * assertion uses — "every gated obligation carries a complete
 * dependsOn". The accessor is deliberately tolerant
 * (missing `applyTo` or missing `dependsOn` return an empty shape
 * rather than throwing) so future callers get one predictable envelope
 * regardless of author-side omissions.
 *
 * `dependsOn` resolution order:
 *   1. If the obligation declares an explicit `dependsOn: string[]`,
 *      use it verbatim (belt-and-braces on hand-authored sites).
 *   2. Otherwise DERIVE from the applyTo helper's `.metadata` — the
 *      meta-first helpers all name their gate obligation on the
 *      metadata, so the dependency graph is data-recoverable without
 *      duplicating it on the obligation. See `deriveDependsOn` below
 *      for the per-helper rules.
 *
 * The derivation preserves the graph invariant: every gated obligation
 * resolves to a `string[]` here, even when the site itself has dropped
 * the explicit annotation.
 *
 * @param {object} obligation — the obligation object from the manifest.
 * @returns {object} — combined metadata: gate-shape fields (if any) +
 *   `dependsOn` (a `string[]` for any obligation whose helper metadata
 *   names its gate; `undefined` only when the obligation has neither an
 *   explicit `dependsOn` nor a recoverable helper metadata — the
 *   coverage assertion uses that to detect uncovered gates).
 */
export const obligationMetadata = (obligation) => {
  const gateMeta = obligation?.applyTo?.metadata ?? {}
  const explicit = obligation?.dependsOn
  const dependsOn = Array.isArray(explicit)
    ? explicit
    : deriveDependsOn(gateMeta)
  return { ...gateMeta, dependsOn }
}

/**
 * deriveDependsOn — recover the `dependsOn` list from an applyTo
 * helper's metadata sidecar. Each meta-first helper names its gate
 * obligation on the metadata; that name IS the dependency (no need to
 * restate it on the obligation).
 *
 * Rules per helper type:
 *   - `allowListed` / `anyAllowListed` / `notInUnionOf` / `matches` /
 *     `equalsGate` / `presentGate` / `includesGate` — `metadata.obligation`
 *     names the single gate obligation; derive `[metadata.obligation]`.
 *   - `branchedGate` — an OPAQUE-by-default helper; the closure body is
 *     the source of truth. Falls back to `metadata.predicateMeta.obligationId`
 *     when the caller annotated it, otherwise `undefined`
 *     (the coverage assertion catches this — a `branchedGate` used as an
 *     escape hatch must still carry an explicit `dependsOn`).
 *   - `alwaysInScope` — no reads; derive `[]`.
 *   - anything else (no metadata, bare closure, structural group) —
 *     `undefined`, deferring to the caller's explicit annotation.
 *
 * @param {object} gateMeta — the `.metadata` sidecar on an applyTo (or `{}`).
 * @returns {string[] | undefined} — the derived dependsOn list, or
 *   `undefined` when the metadata alone can't answer.
 */
const SINGLE_GATE_TYPES = new Set([
  'allowListed',
  'anyAllowListed',
  'notInUnionOf',
  'matches',
  'equalsGate',
  'presentGate',
  'includesGate'
])

const deriveDependsOn = (gateMeta) => {
  const type = gateMeta?.type
  if (SINGLE_GATE_TYPES.has(type)) {
    return typeof gateMeta.obligation === 'string'
      ? [gateMeta.obligation]
      : undefined
  }
  if (type === 'branchedGate') {
    return typeof gateMeta.predicateMeta?.obligationId === 'string'
      ? [gateMeta.predicateMeta.obligationId]
      : undefined
  }
  if (type === 'alwaysInScope') {
    return []
  }
  return undefined
}
