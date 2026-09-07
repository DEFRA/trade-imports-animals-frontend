/**
 * Surface the introspection sidecar for an obligation. Merges the
 * gate-shape metadata attached by the gate helper with the
 * obligation-level `dependsOn` schema key.
 *
 * The reachability prover needs a dependency graph in data, not
 * closures. `dependsOn` is that data; the coverage assertion asserts
 * every gated obligation carries a complete one. Resolution order:
 *
 *   1. Explicit `dependsOn: string[]` on the obligation, used verbatim.
 *   2. Otherwise DERIVE from the gate helper's `.metadata` (see
 *      `deriveDependsOn` below for per-helper rules).
 *
 * Missing `applyTo` or missing derivable metadata returns `undefined`
 * for `dependsOn` — the coverage assertion uses that to flag uncovered
 * gates.
 */
export const obligationMetadata = (obligation) => {
  const gateMetadata = obligation?.applyTo?.metadata ?? {}
  const explicitDependsOn = obligation?.dependsOn
  const dependsOn = Array.isArray(explicitDependsOn)
    ? explicitDependsOn
    : deriveDependsOn(gateMetadata)
  return { ...gateMetadata, dependsOn }
}

/**
 * Per-helper rules for recovering `dependsOn` from a gate helper's
 * metadata. Extending the helper library means updating this table.
 *
 *   - `allowListed` / `anyAllowListed` / `notInUnionOf` / `matches` /
 *     `equalsGate` / `presentGate` / `includesGate`
 *          → `[metadata.obligationId]` (all name a single gate obligation)
 *   - `branchedGate`
 *          → `[metadata.predicateMeta.obligationId]` when annotated;
 *            otherwise `undefined` — the coverage assertion then requires
 *            the site to declare `dependsOn` explicitly.
 *   - `alwaysInScope`
 *          → `[]` (no reads)
 *   - anything else (bare closure, structural group)
 *          → `undefined`, deferring to the caller's explicit annotation.
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

const deriveDependsOn = (gateMetadata) => {
  const gateType = gateMetadata?.gateType
  if (SINGLE_GATE_TYPES.has(gateType)) {
    return typeof gateMetadata.obligationId === 'string'
      ? [gateMetadata.obligationId]
      : undefined
  }
  if (gateType === 'branchedGate') {
    return typeof gateMetadata.predicateMeta?.obligationId === 'string'
      ? [gateMetadata.predicateMeta.obligationId]
      : undefined
  }
  if (gateType === 'alwaysInScope') {
    return []
  }
  return undefined
}
