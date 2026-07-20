import { isRecordMap, readGate } from './helper-internals.js'
import { isBlankValue } from '../engine/is-blank-value.js'

/**
 * applyTo helper library — pure functions that build applyTo functions.
 *
 * Part of a prototype exploring "consolidate on applyTo + helpers" as
 * an alternative to the gatedBy DSL. Companion to
 * `obligations-all-applyto.js`.
 *
 * Design contract:
 *   - Each helper is a pure function returning an
 *     `applyTo(fulfilments, fulfilmentIdsByObligationId) → decision`.
 *   - `fulfilments` is the raw storage map.
 *   - `fulfilmentIdsByObligationId` is a `Map<obligationId, string[]>`
 *     giving current instance-paths per obligation (in particular per
 *     group, so a gated obligation can look up its parent-group's
 *     instances without enumerating storage itself).
 *   - Each returned function has a `.metadata` property describing
 *     the gate declaratively. Enables optional static
 *     introspection / cross-language export without giving up the
 *     imperative-JS surface.
 *
 * Obligation schema — additive keys authored on the obligation object
 * itself (not on the applyTo sidecar):
 *   - `dependsOn?: string[]` — ids of obligations whose stored values
 *     the `applyTo` closure reads. Makes the dependency graph explicit
 *     data alongside the opaque closure so a static reachability prover
 *     can invert gates without executing them. See BRIEF §Migration #2
 *     (★ highest value-per-line) and REPORT §5.1 — "closures must be an
 *     exception with a build-time guard". Phase 2 commit 2 lands the
 *     coverage assertion that fails the build for any gated obligation
 *     without a complete `dependsOn`. Phase 2 commit 1 lands the schema
 *     + this accessor; nothing is enforced yet.
 *
 * All helpers are unit-testable in isolation — see helpers.test.js.
 *
 * Helper taxonomy — which to use when (Phase 4.6 Q2 clarification):
 *
 *   Two shapes of gate exist in this manifest, and they take different
 *   helpers. The distinction is NOT about "same frame vs cross frame"
 *   in the identity-level sense — it's about the SHAPE of the stored
 *   value the gate reads.
 *
 *   1. **Top-level scalar gate** — the gate obligation has no `within`,
 *      OR is otherwise stored as a plain scalar in `fulfilments[gate.id]`.
 *      Example: `reasonForImport` (top-level, scalar). The `applyTo`
 *      returns a SINGLE `{inScope, status, reasons?}` decision.
 *      Use: `equalsGate` / `includesGate` / `presentGate`.
 *
 *   2. **Group-scoped gate** — the gate obligation is `within` a group,
 *      so `fulfilments[gate.id]` is a records-map (`{lineId1: value,
 *      lineId2: value, ...}`). The `applyTo` returns PER-RECORD
 *      decisions (via `filterAndProject`). Use:
 *      - `allowListed` / `notInUnionOf` with `null` projection when the
 *        gated obligation is at the SAME identity level as the gate
 *        (both `within` the same group). Example: `numberOfPackages`
 *        (`within: commodityLine`) reads `commodityCode` (also
 *        `within: commodityLine`) — same level, so null projection.
 *      - `allowListed` / `notInUnionOf` with `projectionGroup` set when
 *        the gated obligation is DEEPER than the gate. Example:
 *        `passport` (`within: unitRecord`, deeper than commodityLine)
 *        reads `commodityCode` (`within: commodityLine`) via projection
 *        `unitRecord` — the engine walks unit-records for each matching
 *        commodity-line.
 *
 *   Rule of thumb: if the gate obligation has a `within`, use the
 *   `allowListed`/`notInUnionOf` family. Otherwise use the scalar
 *   family (`equalsGate` / `includesGate` / `presentGate` /
 *   `alwaysInScope`). `matches` is a same-frame scalar equality gate
 *   with same-frame semantics (kept for backwards compat).
 *   `anyAllowListed` is a scalar aggregation over a group's records
 *   (returns a single decision, not per-record) — for the "cph reads
 *   ANY commodityCode across commodity lines" case; see its docstring.
 *
 *   `branchedGate` is the escape hatch for genuinely non-derivable
 *   predicates. After Phase 4.5 it is absent from the manifest but
 *   retained here for future use — it must be paired with `predicateMeta`
 *   for the reachability prover to synthesise a witness.
 */

/**
 * allowListed — obligation is in scope on entries where
 * `gateObligation`'s stored value is in the allowlist.
 *
 * For depth-1 gates (gate and gated at the same identity level), pass
 * `null` for `projectionGroup`; records are the passing gate keys
 * directly.
 *
 * For depth-N > 1 gates (gate at a broader identity level than the
 * gated obligation), pass the gated obligation's parent group as
 * `projectionGroup`. Records are the group's instance-paths whose
 * ancestor prefix has a gate-passing value. The pipeline's
 * `fulfilmentIdsByObligationId` map supplies the paths — the
 * obligation code doesn't enumerate them itself.
 */
export function allowListed(gateObligation, values, projectionGroup, reasons) {
  const fn = (fulfilments, fulfilmentIdsByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      (value) => values.includes(value),
      projectionGroup,
      fulfilmentIdsByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'allowListed',
    obligation: gateObligation.id,
    values,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  return fn
}

/**
 * notInUnionOf — dual of `allowListed`. Obligation is in scope on
 * entries whose `gateObligation` stored value is NOT in the union of
 * the given allowlists. The derived union is computed at helper-
 * invocation time (not on each call) and pinned on `.metadata.values`
 * so static analysis (witness synthesiser, browser-side controllers)
 * can inspect "would this value be admitted?" without executing the
 * closure.
 *
 * Two input shapes accepted:
 *   - `[[a, b], [c, d]]` — a list of allowlists (typical case:
 *     `notInUnionOf(commodityCode, [PASSPORT_COMMODITIES,
 *     TATTOO_COMMODITIES, EAR_TAG_COMMODITIES, HORSE_NAME_COMMODITIES],
 *     unitRecord, reasons)`). The union is set-like — duplicates across
 *     allowlists collapse.
 *   - `[a, b, c]` — a flat list of values (single-allowlist complement).
 *     Ergonomic shorthand; the derived union is just the input.
 *
 * Rationale — REPORT §5.2, BRIEF §Migration #4. `notInUnionOf` as a
 * derived-union helper over `.metadata.values` is STRICTLY better than
 * a hand-restated four-whitelist complement expressed as an opaque JS
 * predicate: adding a fifth typed identifier to one of the source
 * allowlists widens the derived union automatically; a hand-restated
 * complement would silently double-gate if the author forgot to add a
 * fifth `!X.includes(code)` conjunct.
 *
 * See also `allowListed` (identical projection/frame semantics — the
 * two are duals).
 */
export function notInUnionOf(
  gateObligation,
  unionOfAllowlists,
  projectionGroup,
  reasons
) {
  const derivedUnion = deriveUnion(unionOfAllowlists)
  const admit = (v) => !derivedUnion.includes(v)
  const fn = (fulfilments, fulfilmentIdsByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      admit,
      projectionGroup,
      fulfilmentIdsByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'notInUnionOf',
    obligation: gateObligation.id,
    values: derivedUnion,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  return fn
}

/**
 * presentPerRecord — per-record present gate. The dual of `allowListed`
 * with an "is answered" predicate instead of an allowlist membership
 * test. On each record where `gateObligation`'s stored value is
 * answered (non-blank), the gated obligation is in scope on that record;
 * elsewhere it is out of scope (and purged).
 *
 * Same projection/frame semantics as `allowListed`/`notInUnionOf`:
 *   - same-level gate (gate and gated both `within` the same group) →
 *     pass `null` for `projectionGroup`; records are the passing gate
 *     keys directly. This is the accompanying-documents case — the four
 *     document fields all sit `within: documents`, and the three
 *     dependent fields gate on the same-level `accompanyingDocumentType`.
 *   - deeper gated obligation → pass its parent group as
 *     `projectionGroup` (identical projection rule to `allowListed`).
 *
 * V4 (Confluence page 6497338582): "once a document type is selected,
 * the attachment, reference and date of issue are mandatory to proceed."
 * The gate reads `accompanyingDocumentType`'s per-record value; the
 * gated obligation carries `status: 'mandatory'` so a record with a type
 * makes its dependants mandatory.
 */
export function presentPerRecord(gateObligation, projectionGroup, reasons) {
  const fn = (fulfilments, fulfilmentIdsByObligationId) => {
    const decision = filterAndProject(
      fulfilments[gateObligation.id],
      (value) => !isBlankValue(value),
      projectionGroup,
      fulfilmentIdsByObligationId
    )
    return decision.inScope && reasons ? { ...decision, reasons } : decision
  }
  fn.metadata = {
    type: 'presentPerRecord',
    obligation: gateObligation.id,
    projection: projectionGroup?.id ?? null,
    reasons: reasons ?? null
  }
  return fn
}

/**
 * anyAllowListed — scalar aggregation. True if ANY of the gate
 * obligation's stored values is in the allowlist. Returns whenTrue on
 * match, whenFalse on miss. Handles per-line-gate → notification-level-
 * gated shape (e.g. CPH: "any commodity line has a CPH-required code").
 */
export function anyAllowListed(gateObligation, values, whenTrue, whenFalse) {
  const fn = (fulfilments) => {
    const { candidates } = readGate(fulfilments, gateObligation.id)
    return candidates.some((v) => values.includes(v)) ? whenTrue : whenFalse
  }
  fn.metadata = {
    type: 'anyAllowListed',
    obligation: gateObligation.id,
    values,
    whenTrue,
    whenFalse
  }
  return fn
}

/**
 * branchedGate — evaluate a predicate; return whenTrue or whenFalse.
 *
 * Use for extended-form scope decisions where both branches are
 * in-scope (retain-value / status-swap patterns like the accompanying-
 * document all-or-nothing block).
 *
 * The predicate has the same signature as an applyTo function:
 * `(fulfilments, fulfilmentIdsByObligationId) → boolean`.
 *
 * `predicateMeta` (optional) — structured description of the predicate
 * shape so the Phase 3 reachability prover can synthesise a witness
 * value that opens the gate without executing the closure. Shape:
 *
 *   { operator: 'equals'    , obligationId: string, value: string  }  // fulfilments[id] === value
 *   { operator: 'includes'  , obligationId: string, values: string[] } // values.includes(fulfilments[id])
 *   { operator: 'isFilled'  , obligationId: string                  }  // any non-blank value on id
 *
 * When both `whenTrue.inScope` and `whenFalse.inScope` are `true` the
 * gate is TOTAL and no witness is needed (the prover treats these as
 * trivially open). The four accompanying-document siblings are the
 * only manifest occurrence of that shape today; they omit
 * `predicateMeta` because it isn't consulted. All non-total sites
 * MUST supply `predicateMeta` — Phase 3 commit 3 will land a coverage
 * assertion that fails the build for a non-total `branchedGate`
 * without one.
 *
 * BRIEF §Migration #3 + REPORT §5.1 tax warning: every new predicate
 * operator carries a second tax — a witness synthesiser + a seeding
 * rule. Adding a new `operator` here means updating
 * `analysis/reachability.js` `synthesiseWitness`.
 */
export function branchedGate(predicate, whenTrue, whenFalse, predicateMeta) {
  const fn = (fulfilments, fulfilmentIdsByObligationId) =>
    predicate(fulfilments, fulfilmentIdsByObligationId) ? whenTrue : whenFalse
  fn.metadata = {
    type: 'branchedGate',
    whenTrue,
    whenFalse,
    predicateMeta: predicateMeta ?? null
  }
  return fn
}

/**
 * matches — scalar equality check. True where `gateObligation`'s
 * stored value equals `value`. Returns a scalar decision.
 */
export function matches(gateObligation, value) {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value
      ? { inScope: true }
      : { inScope: false }
  fn.metadata = { type: 'matches', obligation: gateObligation.id, value }
  return fn
}

/**
 * present — predicate primitive. True iff the given obligation has
 * any stored value. For scalar obligations checks `!== undefined`;
 * for indexed obligations checks the storage map has at least one key.
 *
 * Returns a predicate (not an applyTo). Compose into a `branchedGate`
 * or `.some()` / `.every()` chain with other siblings for
 * cross-sibling patterns.
 */
export function present(obligation) {
  return (fulfilments) => {
    const stored = fulfilments[obligation.id]
    if (stored === undefined) return false
    if (stored === null) return false
    if (isRecordMap(stored)) return Object.keys(stored).length > 0
    return true
  }
}

// -----------------------------------------------------------------------------
// Meta-first gate helpers — EUDPA-288 Phase 4.5.1.
//
// The `branchedGate`-plus-`predicateMeta` pattern used by regionCode /
// purposeInInternalMarket / commercialTransporter / privateTransporter /
// transitedCountries co-declares the same dependency THREE times: the
// predicate closure body reads `fulfilments[X.id]`, `predicateMeta`
// restates it as `{operator, obligationId, value}`, and `dependsOn`
// restates it a third time as `[X.id]`. Rename the gate obligation and
// three touchpoints have to stay aligned — miss one and the closure
// body silently drifts from what static analysis THINKS the gate reads.
//
// The four helpers below (`equalsGate`, `presentGate`, `includesGate`,
// `alwaysInScope`) extend the pattern that `allowListed` / `notInUnionOf`
// already use — the helper's `.metadata` IS the definition, and the
// closure body is auto-generated from it. Phase 4.5.2 migrates the 10
// call sites; this file only introduces the helpers (purely additive —
// `branchedGate` stays as an escape hatch for genuinely opaque
// predicates, of which the manifest today has none).
//
// Frame semantics — all four helpers use the SAME-FRAME scalar-read
// pattern used by `matches` / `anyAllowListed` / `branchedGate`: the
// closure reads `fulfilments[gateObligation.id]` and returns a scalar
// decision object. No `filterAndProject`, no projection group, no
// touching of `fulfilmentIdsByObligationId`. The migration sites are
// all notification-level scalar gates; the depth-N projection variants
// stay `allowListed` / `notInUnionOf`.
// -----------------------------------------------------------------------------

/**
 * equalsGate — "gate stored value === target ? whenTrue : whenFalse".
 *
 * The workhorse for status-swap and purge-on-flip patterns:
 *   - `regionCode` — mandatory when `regionCodeRequirement === 'yes'`,
 *     otherwise optional (both branches in-scope; status flips).
 *   - `purposeInInternalMarket` — mandatory when `reasonForImport ===
 *     'internal-market'`, otherwise out of scope (purge on flip).
 *   - `commercialTransporter` / `privateTransporter` — in scope when
 *     `transporterType` matches, otherwise out of scope.
 *
 * The status-flip case (both branches in-scope) is a natural consequence
 * of the caller-supplied decisions — no separate status-only variant is
 * needed. Whatever the caller passes as `whenTrue` / `whenFalse` is
 * returned verbatim.
 *
 * @param {object} gateObligation — the obligation whose stored value is read.
 * @param {*} value — the target value for equality.
 * @param {object} whenTrue — decision returned on match.
 * @param {object} whenFalse — decision returned on mismatch.
 */
export function equalsGate(gateObligation, value, whenTrue, whenFalse) {
  const fn = (fulfilments) =>
    fulfilments[gateObligation.id] === value ? whenTrue : whenFalse
  fn.metadata = {
    type: 'equalsGate',
    obligation: gateObligation.id,
    value,
    whenTrue,
    whenFalse
  }
  return fn
}

/**
 * presentGate — "gate has ANY answer ? whenTrue : whenFalse". The
 * closure body defers to the same "answered" test used by `present`:
 * scalar values other than `null`/`undefined` count as present; indexed
 * obligations count as present iff at least one key exists.
 *
 * Migration site: `accompanyingDocumentType`'s self-referential
 * status-swap block (though the four accompanying-document siblings
 * currently share a `branchedGate` reading `documentTypePresent`).
 * Under Phase 4.5.2 the four siblings can either share a single
 * `presentGate(accompanyingDocumentType, {mandatory}, {optional})` or
 * each site declares its own.
 *
 * @param {object} gateObligation — the obligation whose "answered" state gates.
 * @param {object} whenTrue — decision returned when gate is answered.
 * @param {object} whenFalse — decision returned when gate is unanswered.
 */
export function presentGate(gateObligation, whenTrue, whenFalse) {
  const isPresent = present(gateObligation)
  const fn = (fulfilments) => (isPresent(fulfilments) ? whenTrue : whenFalse)
  fn.metadata = {
    type: 'presentGate',
    obligation: gateObligation.id,
    whenTrue,
    whenFalse
  }
  return fn
}

/**
 * includesGate — "gate stored value is in [values] ? whenTrue : whenFalse".
 *
 * The one-liner for `transitedCountries`'s
 * `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])`
 * predicate. Structurally analogous to `equalsGate` but with a set of
 * admitted values rather than a single scalar target.
 *
 * NOT to be confused with `allowListed` — `allowListed` filters over a
 * KEYED-RECORD storage shape and projects to instance-paths (depth-N
 * gates); `includesGate` reads the gate value as a scalar and returns
 * a scalar decision.
 *
 * @param {object} gateObligation — the obligation whose stored value is read.
 * @param {Array} values — the admitted list.
 * @param {object} whenTrue — decision returned on inclusion.
 * @param {object} whenFalse — decision returned on exclusion.
 */
export function includesGate(gateObligation, values, whenTrue, whenFalse) {
  const fn = (fulfilments) =>
    values.includes(fulfilments[gateObligation.id]) ? whenTrue : whenFalse
  fn.metadata = {
    type: 'includesGate',
    obligation: gateObligation.id,
    values,
    whenTrue,
    whenFalse
  }
  return fn
}

/**
 * alwaysInScope — no gate; the decision is unconditional. Retained
 * post Phase 4.5.3 for the ONE case the data-only obligation shape
 * cannot express: an always-in-scope obligation that must attach a
 * `reasons` list to the decision object. The evaluator's `field`
 * classifier returns `{ inScope: true, status: obligation.status }`
 * — no reasons channel. Any always-in-scope obligation that needs to
 * annotate WHY (e.g. a status flip explained by upstream policy)
 * should use `applyTo: alwaysInScope('mandatory', [reason])` rather
 * than reintroducing a bare closure — the helper's metadata is
 * introspectable and its witness classifies as TRIVIAL.
 *
 * The 19 sites Phase 4.5.3 dropped had NO reasons, so the data-only
 * shape absorbed them all; `alwaysInScope` sits idle on the manifest
 * today but is not deprecated — it is the reserved lane for the
 * "always in scope + reasons" combination the field branch cannot
 * express.
 *
 * The witness synthesiser reads `.metadata.type === 'alwaysInScope'`
 * and classifies as `WITNESS_KIND.TRIVIAL` — no closure execution,
 * no witness value.
 *
 * @param {string} status — 'mandatory' or 'optional'.
 * @param {Array} [reasons] — optional reasons to attach.
 */
export function alwaysInScope(status, reasons) {
  const decision = reasons
    ? { inScope: true, status, reasons }
    : { inScope: true, status }
  const fn = () => decision
  fn.metadata = {
    type: 'alwaysInScope',
    status,
    reasons: reasons ?? null
  }
  return fn
}

/**
 * obligationMetadata — surface the introspection sidecar for an
 * obligation. Merges the gate-shape metadata attached by the applyTo
 * helper (`allowListed`, `equalsGate`, etc.) with the obligation-
 * level `dependsOn` schema key.
 *
 * Rationale — BRIEF §Migration #2 (★ highest value-per-line) +
 * REPORT §5.1: closures are opaque to a reachability prover unless
 * they declare their dependency graph as data. `dependsOn` is that
 * declaration; this accessor is the single call site the Phase 2
 * commit 2 coverage assertion uses — "every gated obligation carries
 * a complete dependsOn". The accessor is deliberately tolerant
 * (missing `applyTo` or missing `dependsOn` return an empty shape
 * rather than throwing) so future callers get one predictable envelope
 * regardless of author-side omissions.
 *
 * `dependsOn` resolution order (Phase 4.5.2):
 *   1. If the obligation declares an explicit `dependsOn: string[]`,
 *      use it verbatim (belt-and-braces on hand-authored sites).
 *   2. Otherwise DERIVE from the applyTo helper's `.metadata` — the
 *      meta-first helpers all name their gate obligation on the
 *      metadata, so the dependency graph is data-recoverable without
 *      duplicating it on the obligation. See `deriveDependsOn` below
 *      for the per-helper rules.
 *
 * The derivation preserves the graph invariant that Phase 2 commit 2
 * established: every gated obligation resolves to a `string[]` here,
 * even when the site itself has dropped the explicit annotation.
 *
 * @param {object} obligation — the obligation object from the manifest.
 * @returns {object} — combined metadata: gate-shape fields (if any) +
 *   `dependsOn` (a `string[]` for any obligation whose helper metadata
 *   names its gate; `undefined` only when the obligation has neither an
 *   explicit `dependsOn` nor a recoverable helper metadata — commit 2
 *   uses that to detect uncovered gates).
 */
export function obligationMetadata(obligation) {
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
 *     when the caller annotated it (Phase 3 shape), otherwise `undefined`
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
function deriveDependsOn(gateMeta) {
  switch (gateMeta?.type) {
    case 'allowListed':
    case 'anyAllowListed':
    case 'notInUnionOf':
    case 'presentPerRecord':
    case 'matches':
    case 'equalsGate':
    case 'presentGate':
    case 'includesGate':
      return typeof gateMeta.obligation === 'string'
        ? [gateMeta.obligation]
        : undefined
    case 'branchedGate':
      return typeof gateMeta.predicateMeta?.obligationId === 'string'
        ? [gateMeta.predicateMeta.obligationId]
        : undefined
    case 'alwaysInScope':
      return []
    default:
      return undefined
  }
}

// -----------------------------------------------------------------------------
// Internal — shared filter-and-project logic between allowListed and
// notInUnionOf. The `stored → candidates` normalization used by the
// scalar-aggregation helpers (`anyAllowListed`) and the shape test
// used by `filterAndProject` / `present` live in `helper-internals.js`.
// -----------------------------------------------------------------------------

/**
 * deriveUnion — collapse a list of allowlists (or a flat list of
 * values) into a set-like array. Preserves first-seen order across
 * inputs so `.metadata.values` is deterministic + comparable.
 */
function deriveUnion(unionOfAllowlists) {
  const flat =
    unionOfAllowlists.length > 0 && Array.isArray(unionOfAllowlists[0])
      ? unionOfAllowlists.flat()
      : unionOfAllowlists
  const seen = new Set()
  const out = []
  for (const v of flat) {
    if (seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  return out
}

function filterAndProject(
  storedForGate,
  predicate,
  projectionGroup,
  fulfilmentIdsByObligationId
) {
  const stored = storedForGate ?? {}
  const passingKeys = isRecordMap(stored)
    ? Object.entries(stored)
        .filter(([, value]) => predicate(value))
        .map(([key]) => key)
    : predicate(stored)
      ? ['']
      : []

  if (passingKeys.length === 0) return { inScope: false }

  if (!projectionGroup) {
    return { inScope: true, records: passingKeys }
  }

  const projectionPaths =
    fulfilmentIdsByObligationId?.get(projectionGroup.id) ?? []
  const records = projectionPaths.filter((path) =>
    passingKeys.some(
      (key) => key === '' || path === key || path.startsWith(`${key}/`)
    )
  )
  return { inScope: records.length > 0, records }
}
