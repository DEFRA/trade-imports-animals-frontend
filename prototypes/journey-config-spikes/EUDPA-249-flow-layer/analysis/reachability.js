/**
 * reachability.js — graph-level + value-level dependency-reachability prover.
 *
 * Ported from A's `analysis/reachability.js` (the standalone spike),
 * adapted to B's dependency model. This is Phase 3 commits 1 + 2 of the
 * EUDPA-288 blend plan (BRIEF §Migration #3, REPORT §5.1 — "closures
 * must be an exception with a build-time guard").
 *
 * ---------------------------------------------------------------------------
 * Divergence from A — the "conservative closure treatment" invariant
 * ---------------------------------------------------------------------------
 *
 * A's prover works because A's gates are CLOSED-VOCABULARY DATA: four
 * operators (`equals`, `includes`, `notInUnionOf`, `present`), each
 * pattern-matched in A's `predicate.js`. A's `gateValue()` can therefore
 * INVERT a gate to synthesise a witness — "what value would make this
 * gate fire?" — and A's `proveReachability` walks page-graphs proving
 * every obligation has a witness that puts its page in scope.
 *
 * B's gates are JS closures. Even after Phase 2's `dependsOn` sweep the
 * closure body is opaque; the metadata declares WHICH obligations a
 * closure reads (`dependsOn`), not WHAT VALUES would satisfy the
 * predicate. Commit 2 (this file) adds a `synthesiseWitness()` accessor
 * that inspects the structured helper sidecar (`allowListed`,
 * `anyAllowListed`, `matches`, and `branchedGate` when annotated with a
 * `predicateMeta` operator description) and returns a concrete
 * `{ obligationId, value }` that would open the gate. A tightened
 * prover (`proveWithWitnesses`) runs the actual `applyTo` closure
 * against the synthesised witness, confirming the gate really does
 * fire — no more vacuously-green graph-only pass. Commit 3 will add a
 * coverage assertion pinning that every "structured" helper carries a
 * witness synthesiser here.
 *
 * At the GRAPH level, `dependsOn` alone recovers the recovery-relevant
 * structure. Under the conservative rule:
 *
 *   "an obligation is reachable IFF every id in its `dependsOn` list is
 *    reachable, seeded from the always-in-scope set (obligations with
 *    `dependsOn: []`)."
 *
 * This is precisely what A's prover collapses to for gates whose
 * predicates it can't invert. `proveReachability` implements exactly
 * this. `proveWithWitnesses` sits on top: same graph, but each gate
 * whose helper carries a recoverable predicate must ALSO be provable
 * value-side (witness synthesis + closure re-run).
 *
 * ---------------------------------------------------------------------------
 * Self-loop treatment
 * ---------------------------------------------------------------------------
 *
 * A pure self-loop (`dependsOn === [own-id]`) has NO external prereq —
 * nothing beyond the obligation itself constrains whether the gate
 * fires. We treat such self-loops as seeds (equivalent to `dependsOn:
 * []` at the graph level). The manifest's one legitimate self-loop is
 * `accompanyingDocumentType`, whose gate closure reads its own stored
 * value; the branchedGate is total-over-branches (both `whenTrue` and
 * `whenFalse` have `inScope: true`), so value-level analysis in commit
 * 2 will confirm the gate is always-in-scope regardless of the read
 * value. At the graph level, it suffices to recognise the loop as
 * "self-only reads → no external prereq → seed".
 *
 * ---------------------------------------------------------------------------
 * Dangling ids
 * ---------------------------------------------------------------------------
 *
 * Phase 2's coverage assertion should already prevent them, but the
 * prover is defensive: any `dependsOn` id that doesn't resolve to a
 * record in the input manifest is reported as an error (with the
 * offending obligation id) rather than crashing. The obligation
 * carrying the dangling id is neither reachable nor unreachable; it is
 * `errors[]` only.
 */

/**
 * proveReachability — run the graph-level prover over a list of
 * `{ id, dependsOn }` records. Deliverable, in the shape A's prover
 * returns for its own three-outcome enumeration:
 *
 *   {
 *     reachable:   string[],  // ids that trace to a seed
 *     unreachable: string[],  // ids whose deps never terminate at a seed
 *     errors:      { obligationId, reason }[]  // structural defects
 *   }
 *
 * Called from `analysis/reachability.test.js` and (eventually) from
 * commit 3's coverage gate that walks `obligations` +
 * `obligationMetadata` to build the record list.
 *
 * @param {Array<{id: string, dependsOn: string[] | undefined}>} records
 * @returns {{ reachable: string[], unreachable: string[], errors: Array<{obligationId: string, reason: string}> }}
 */
export function proveReachability(records) {
  const byId = new Map(records.map((r) => [r.id, r]))
  const errors = []

  // First pass — surface structural anomalies (dangling ids, missing
  // dependsOn arrays). Anomalous obligations are excluded from the
  // reachable/unreachable classification and reported only in errors.
  const structurallyBad = new Set()
  for (const rec of records) {
    if (!Array.isArray(rec.dependsOn)) {
      errors.push({
        obligationId: rec.id,
        reason:
          'missing dependsOn array (Phase 2 coverage assertion should have caught this)'
      })
      structurallyBad.add(rec.id)
      continue
    }
    for (const depId of rec.dependsOn) {
      if (depId === rec.id) continue // self-loop is not a dangling id
      if (!byId.has(depId)) {
        errors.push({
          obligationId: rec.id,
          reason: `dependsOn references unknown obligation id '${depId}'`
        })
        structurallyBad.add(rec.id)
        break // one error per obligation is enough
      }
    }
  }

  // Reachability closure — fixed-point iteration. An obligation is
  // reachable if either:
  //   (a) it has an empty dependsOn (an always-in-scope seed), OR
  //   (b) its dependsOn is a pure self-loop `[own-id]` — no external
  //       prerequisite, so it acts as a seed (see docstring); OR
  //   (c) every non-self dep is already reachable.
  //
  // Iterate until no new nodes are marked. Structurally-bad nodes are
  // never marked reachable — they're excluded from the classification.
  const reachable = new Set()
  const isSeed = (rec) => {
    if (rec.dependsOn.length === 0) return true
    // pure self-loop — all deps are the obligation's own id
    if (rec.dependsOn.every((depId) => depId === rec.id)) return true
    return false
  }

  let changed = true
  while (changed) {
    changed = false
    for (const rec of records) {
      if (reachable.has(rec.id)) continue
      if (structurallyBad.has(rec.id)) continue
      if (isSeed(rec)) {
        reachable.add(rec.id)
        changed = true
        continue
      }
      // Non-self deps must ALL be reachable. Self-deps are ignored
      // (the self-loop-as-seed rule above handles the pure case; here
      // a mixed dep list — some external, some self — still needs the
      // external prereqs satisfied, and the self-ref is a no-op).
      const externalDeps = rec.dependsOn.filter((depId) => depId !== rec.id)
      if (externalDeps.every((depId) => reachable.has(depId))) {
        reachable.add(rec.id)
        changed = true
      }
    }
  }

  const unreachable = records
    .filter((rec) => !reachable.has(rec.id) && !structurallyBad.has(rec.id))
    .map((rec) => rec.id)

  return {
    reachable: [...reachable],
    unreachable,
    errors
  }
}

// ---------------------------------------------------------------------------
// Witness synthesis — Phase 3 commit 2 (BRIEF §Migration #3, REPORT §5.1
// "witness synthesiser + seeding rule per operator" tax warning).
//
// Each structured helper attaches a `.metadata` sidecar describing its
// gate shape. `synthesiseWitness` inspects that sidecar and returns a
// concrete `{ obligationId, value }` pair that — when written into a
// fulfilments map keyed by `obligationId` — makes the closure return
// `inScope: true`. The tightened prover (`proveWithWitnesses`) uses
// the witness to confirm value-level reachability, not just graph
// reachability.
//
// Classification of the manifest's 19 gated obligations:
//   - structured (witness-synthesisable) — helpers with recoverable
//     metadata: `allowListed`, `anyAllowListed`, `matches`, plus
//     `branchedGate` when the caller supplies `predicateMeta`.
//   - trivial (total-over-branches) — `branchedGate` where both
//     `whenTrue.inScope` and `whenFalse.inScope` are `true`. The gate
//     is always open regardless of the closure's read; no witness
//     needed. Currently the four accompanying-document siblings.
//   - opaque — `allowListedByPredicate`. The predicate is a plain JS
//     function; no data-level target-value is recoverable. Currently
//     `identificationDetails` + `description` (2 gates). Stays in the
//     conservative-graph-only bucket. Commit 3's coverage assertion
//     lists this helper as an EXCLUSION rather than requiring a synth.
// ---------------------------------------------------------------------------

/**
 * Witness kind — the classification `synthesiseWitness` returns so the
 * prover can branch on it uniformly. Exported for commit 3's coverage
 * gate: every gated obligation must classify as one of these three.
 *
 * - `'witness'`  — value-level check available: `{ kind: 'witness',
 *                  obligationId, value }`.
 * - `'trivial'`  — gate is always open (both branches in-scope, or the
 *                  obligation carries no `applyTo`): `{ kind: 'trivial' }`.
 * - `'opaque'`   — helper metadata does not carry a data-level target;
 *                  falls back to graph-level check only:
 *                  `{ kind: 'opaque', reason }`.
 */
export const WITNESS_KIND = Object.freeze({
  WITNESS: 'witness',
  TRIVIAL: 'trivial',
  OPAQUE: 'opaque'
})

/**
 * STRUCTURED_HELPER_TYPES — the `.metadata.type` labels for helpers
 * whose gates `synthesiseWitness` can invert into a concrete
 * `{ obligationId, value }` witness. Each label here MUST have a
 * matching `case` in `synthesiseWitness`'s dispatch (the coverage test
 * in `analysis/coverage.test.js` pins this both ways). Adding a new
 * structured helper is a three-touch change: helper in `helpers.js`,
 * case in `synthesiseWitness`, and an entry here.
 *
 * BRIEF §Migration #3 + REPORT §5.1: "every new operator carries a
 * second tax — a witness synthesiser + a seeding rule". This set is
 * the build-time enforcement of the first half of that tax.
 */
export const STRUCTURED_HELPER_TYPES = new Set([
  'allowListed',
  'anyAllowListed',
  'matches',
  'branchedGate'
])

/**
 * OPAQUE_HELPER_TYPES — the `.metadata.type` labels for helpers
 * classified as opaque BY DECLARED DESIGN. Presence here is an
 * explicit deferral, not "we forgot to write the synth". Every entry
 * must be justified with a comment naming the reason.
 *
 * - `allowListedByPredicate` — the predicate is a plain JS function
 *   over the stored value; there's no recoverable data-level target.
 *   The manifest's `identificationDetails` + `description` use this to
 *   express INVERSE gates ("commodity code is NOT in any of the four
 *   specific-identifier whitelists"). Phase 4 §Migration #4 will land
 *   a `notInUnionOf` derived-union helper that closes this — after
 *   which these two gates migrate off `allowListedByPredicate` and
 *   this entry can be removed. Until then: graph-level reachability
 *   only, coverage assertion excludes them by naming this helper type
 *   here.
 */
export const OPAQUE_HELPER_TYPES = new Set(['allowListedByPredicate'])

/**
 * synthesiseWitness — inspect an obligation's `applyTo.metadata` and
 * return a witness classification.
 *
 * @param {object} obligation — manifest entry with `.applyTo` (or not).
 * @returns {{ kind: 'witness', obligationId: string, value: any }
 *          | { kind: 'trivial' }
 *          | { kind: 'opaque', reason: string }}
 */
export function synthesiseWitness(obligation) {
  const applyTo = obligation?.applyTo
  if (typeof applyTo !== 'function') {
    // No applyTo — structural group (commodityLine, unitRecord). The
    // graph-level pass treats these as trivial seeds; witness-side
    // matches that classification.
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  const meta = applyTo.metadata
  if (!meta) {
    // Bare closure (e.g. `() => ({ inScope: true, status: 'mandatory' })`).
    // Always-in-scope by construction; no witness needed.
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  switch (meta.type) {
    case 'allowListed':
      // metadata.values IS the allowlist — first entry is a witness.
      // Include the projection group id (if any) so the fidelity check
      // can seed a synthetic path in `fulfilmentIdsByObligationId` for
      // depth-N > 1 gates (passport, tattoo, earTag, horseName,
      // permanentAddress — all project onto unitRecord). Without a
      // projection path the closure's `filterAndProject` returns
      // records: [] and `inScope: false`, which would be a false
      // negative — the gate WOULD open in the real evaluator, which
      // always seeds unitRecord paths from user-created units.
      if (!Array.isArray(meta.values) || meta.values.length === 0) {
        return {
          kind: WITNESS_KIND.OPAQUE,
          reason: 'allowListed metadata has empty values array'
        }
      }
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligation,
        value: meta.values[0],
        projection: meta.projection ?? null
      }

    case 'anyAllowListed':
      // Same shape as allowListed — but anyAllowListed has no
      // projection group (notification-level aggregate).
      if (!Array.isArray(meta.values) || meta.values.length === 0) {
        return {
          kind: WITNESS_KIND.OPAQUE,
          reason: 'anyAllowListed metadata has empty values array'
        }
      }
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligation,
        value: meta.values[0]
      }

    case 'matches':
      // metadata.value IS the scalar target.
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligation,
        value: meta.value
      }

    case 'branchedGate':
      return synthesiseBranchedGateWitness(meta)

    case 'allowListedByPredicate':
      // Truly opaque — the predicate is a plain JS function. The
      // manifest's identificationDetails + description use this to
      // express an INVERSE gate ("commodity code is NOT in any of the
      // specific-identifier whitelists"). To become invertible the
      // helper would need to attach either an explicit `notInUnionOf`
      // reference-set on the metadata (A's approach) or an equivalent
      // structured shape. See DESIGN-DELTA.md.
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: 'allowListedByPredicate — predicate is a plain JS function'
      }

    default:
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `unrecognised helper metadata type '${meta.type}'`
      }
  }
}

/**
 * synthesiseBranchedGateWitness — split out because `branchedGate` has
 * three sub-cases (total, structured predicateMeta, opaque). Two
 * classifiers to keep separate: TOTAL is when BOTH branches are in-
 * scope (any input opens the gate → no witness needed); WITNESS is
 * when the caller annotated a `predicateMeta` describing the operator.
 */
function synthesiseBranchedGateWitness(meta) {
  const trueTotal = meta.whenTrue?.inScope === true
  const falseTotal = meta.whenFalse?.inScope === true
  if (trueTotal && falseTotal) {
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  const pm = meta.predicateMeta
  if (!pm) {
    return {
      kind: WITNESS_KIND.OPAQUE,
      reason: 'branchedGate without predicateMeta (annotate the call site)'
    }
  }

  switch (pm.operator) {
    case 'equals':
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: pm.obligationId,
        value: pm.value
      }
    case 'includes':
      if (!Array.isArray(pm.values) || pm.values.length === 0) {
        return {
          kind: WITNESS_KIND.OPAQUE,
          reason: 'branchedGate predicateMeta.includes has empty values'
        }
      }
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: pm.obligationId,
        value: pm.values[0]
      }
    case 'isFilled':
      // Any non-blank value opens the gate. Pick a stable sentinel — a
      // non-empty string that will pass the shared `isFilled` predicate
      // used across the manifest (see obligations.js `isFilled`).
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: pm.obligationId,
        value: '__witness__'
      }
    default:
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `branchedGate predicateMeta has unrecognised operator '${pm.operator}'`
      }
  }
}

/**
 * proveWithWitnesses — tightened prover. Runs the graph-level check
 * first (must succeed), then confirms every gate whose helper carries
 * recoverable metadata can actually be opened by feeding the
 * synthesised witness into the real `applyTo` closure and asserting
 * `inScope: true`. Trivially-open gates (total branchedGate,
 * structural groups) pass without a closure run. Opaque gates fall
 * back to graph-only (recorded on the result so callers can see how
 * much of the manifest gets the tightened check).
 *
 * @param {Array<object>} obligations — the manifest entries themselves
 *   (not the `{id, dependsOn}` records fed to `proveReachability`).
 *   Each must carry an `id` at minimum; gated entries carry
 *   `applyTo.metadata` + `dependsOn`.
 * @returns {{
 *   reachable: string[],
 *   unreachable: string[],
 *   errors: Array<{obligationId: string, reason: string}>,
 *   witnesses: {
 *     synthesisable: string[],  // gates value-level proved
 *     trivial: string[],        // gates trivially open (no witness needed)
 *     opaque: string[]          // gates left at graph-level only
 *   }
 * }}
 */
export function proveWithWitnesses(obligations) {
  const records = obligations.map((o) => {
    if (typeof o.applyTo === 'function') {
      return { id: o.id, dependsOn: o.dependsOn }
    }
    return { id: o.id, dependsOn: [] }
  })

  const graph = proveReachability(records)

  const synthesisable = []
  const trivial = []
  const opaque = []
  const errors = [...graph.errors]

  for (const o of obligations) {
    const w = synthesiseWitness(o)
    switch (w.kind) {
      case WITNESS_KIND.TRIVIAL:
        trivial.push(o.id)
        break
      case WITNESS_KIND.OPAQUE:
        opaque.push(o.id)
        break
      case WITNESS_KIND.WITNESS: {
        // Fidelity check — the witness must actually open the closure.
        // Any mismatch is a build-time defect (metadata drift vs. the
        // real predicate).
        //
        // Depth-N > 1 gates use `allowListed` with a projection group
        // (e.g. passport / tattoo project onto unitRecord). The
        // closure's filterAndProject requires ≥ 1 path in
        // `fulfilmentIdsByObligationId` for the projection group,
        // otherwise `records: []` → `inScope: false` regardless of
        // the value. In the real evaluator paths come from user-
        // created group instances; for the fidelity check we seed a
        // synthetic instance-path whose prefix matches the gate key
        // used below. Depth-1 gates and non-projected helpers
        // (anyAllowListed, matches, branchedGate) pass an empty Map.
        //
        // Gate storage shape:
        //   - `allowListed` reads `fulfilments[gateId]` as a MAP
        //     `{ instancePath: value }`. Use `line1` as the mnemonic
        //     path key.
        //   - non-projected helpers accept either a scalar or a map
        //     interchangeably; a scalar is simplest.
        const fulfilmentIds = new Map()
        let fulfilments
        if (w.projection) {
          // Depth-N gate — seed one synthetic unit path whose prefix
          // (`line1`) matches the map key we place the value under.
          fulfilments = { [w.obligationId]: { line1: w.value } }
          fulfilmentIds.set(w.projection, ['line1/unit1'])
        } else if (o.applyTo.metadata?.type === 'allowListed') {
          // Depth-1 allowListed without a projection group — still
          // reads as a map.
          fulfilments = { [w.obligationId]: { line1: w.value } }
        } else {
          fulfilments = { [w.obligationId]: w.value }
        }
        const decision = o.applyTo(fulfilments, fulfilmentIds)
        if (!decision || decision.inScope !== true) {
          errors.push({
            obligationId: o.id,
            reason: `synthesised witness { ${w.obligationId}: ${JSON.stringify(w.value)} } did not open the gate (got ${JSON.stringify(decision)})`
          })
        } else {
          synthesisable.push(o.id)
        }
        break
      }
      /* c8 ignore next 2 */
      default:
        errors.push({
          obligationId: o.id,
          reason: `synthesiseWitness returned unknown kind '${w.kind}'`
        })
    }
  }

  return {
    reachable: graph.reachable,
    unreachable: graph.unreachable,
    errors,
    witnesses: {
      synthesisable,
      trivial,
      opaque
    }
  }
}
