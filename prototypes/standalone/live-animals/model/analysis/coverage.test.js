/**
 * coverage.test.js — Phase 3 commit 3 of the EUDPA-288 blend plan.
 *
 * The witness-synth registry inside `synthesiseWitness` grows one case
 * per structured helper. BRIEF §Migration #3 + REPORT §5.1 name the
 * tax explicitly:
 *
 *   "Every new operator A adds carries a second tax: a witness
 *    synthesiser in `gateValue` and a seeding rule in `scaffoldFor`.
 *    Skip it and the pin silently stops proving anything."
 *
 * The equivalent tax for B: every new helper in `obligations/helpers.js`
 * that attaches `.metadata.type` must either be added to the witness-
 * synthesiser dispatch (STRUCTURED) or explicitly listed as opaque-by-
 * design (OPAQUE). Without this coverage gate, someone can add a sixth
 * helper next quarter without a synth, and the prover's classification
 * silently drifts toward "everything opaque, everything green" — the
 * vacuously-green failure mode BRIEF explicitly warns against.
 *
 * The invariants pinned here:
 *
 *   1. `STRUCTURED_HELPER_TYPES` and `OPAQUE_HELPER_TYPES` are exported
 *      from `analysis/reachability.js`. STRUCTURED is non-empty;
 *      OPAQUE may be empty (post-Phase-4 §Migration #4 clean-slate).
 *   2. The two sets are DISJOINT (a helper type can't be both).
 *   3. `STRUCTURED_HELPER_TYPES` exactly matches the `case` labels
 *      dispatched inside `synthesiseWitness` — the registry can't
 *      declare a helper structured while omitting the synth (or vice
 *      versa).
 *   4. Every export of `obligations/helpers.js` that produces a gate
 *      function with `.metadata.type` classifies as one of those two
 *      sets — no unlisted helpers.
 *   5. A synthesised sample of each STRUCTURED helper type actually
 *      returns a `WITNESS_KIND.WITNESS` (or `.TRIVIAL` when the sample
 *      is trivially-open by construction) — never `.OPAQUE`.
 *   6. A synthesised sample of each OPAQUE helper type returns
 *      `WITNESS_KIND.OPAQUE`.
 *
 * Failure-mode intuition: rename a helper's `.metadata.type` string
 * (e.g. `'allowListed'` → `'allowListedTypo'`) and the invariant #4
 * test fails with a clear diff. Add a new helper `notInUnionOf` that
 * attaches `.metadata.type = 'notInUnionOf'` without updating either
 * set and invariant #4 fires. Add a case label inside
 * `synthesiseWitness` without adding it to `STRUCTURED_HELPER_TYPES`
 * and invariant #3 fires. Etc.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  STRUCTURED_HELPER_TYPES,
  OPAQUE_HELPER_TYPES,
  WITNESS_KIND,
  synthesiseWitness
} from './reachability.js'
import * as helpers from '../obligations/helpers.js'

// ---------------------------------------------------------------------------
// Sample factories — one per helper. Each factory returns an obligation
// object shaped the way the manifest wires helpers up. Kept small and
// self-contained so the coverage assertions can round-trip through the
// real helper + `synthesiseWitness` without needing manifest state.
//
// A helper NOT listed here fires the "no sample for helper" invariant —
// that keeps `SAMPLE_OBLIGATIONS` in step with the helper surface.
// ---------------------------------------------------------------------------

const gateObl = { id: 'gate-obl' }

const SAMPLE_OBLIGATIONS = {
  allowListed: {
    id: 'sample-allowListed',
    applyTo: helpers.allowListed(gateObl, ['a', 'b'])
  },
  anyAllowListed: {
    id: 'sample-anyAllowListed',
    applyTo: helpers.anyAllowListed(
      gateObl,
      ['x'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  matches: {
    id: 'sample-matches',
    applyTo: helpers.matches(gateObl, 'yes')
  },
  branchedGate: {
    id: 'sample-branchedGate',
    applyTo: helpers.branchedGate(
      (f) => f[gateObl.id] === 'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false },
      { operator: 'equals', obligationId: gateObl.id, value: 'yes' }
    )
  },
  notInUnionOf: {
    id: 'sample-notInUnionOf',
    applyTo: helpers.notInUnionOf(gateObl, [
      ['a', 'b'],
      ['c', 'd']
    ])
  },
  // Meta-first gate helpers — EUDPA-288 Phase 4.5.1. The purge-on-flip
  // shape (whenFalse.inScope === false) exercises the WITNESS path in
  // synthesiseWitness; the total-branches shape (both in-scope) would
  // exercise TRIVIAL — either is acceptable per invariant #5.
  equalsGate: {
    id: 'sample-equalsGate',
    applyTo: helpers.equalsGate(
      gateObl,
      'yes',
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  presentGate: {
    id: 'sample-presentGate',
    applyTo: helpers.presentGate(
      gateObl,
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  includesGate: {
    id: 'sample-includesGate',
    applyTo: helpers.includesGate(
      gateObl,
      ['a', 'b'],
      { inScope: true, status: 'mandatory' },
      { inScope: false }
    )
  },
  alwaysInScope: {
    id: 'sample-alwaysInScope',
    applyTo: helpers.alwaysInScope('mandatory')
  }
}

// ---------------------------------------------------------------------------
// Invariant #1 + #2 — sets exist, are non-empty, disjoint.
// ---------------------------------------------------------------------------

describe('coverage — helper classification sets are exported and disjoint', () => {
  it('Should export STRUCTURED_HELPER_TYPES as a non-empty Set', () => {
    expect(STRUCTURED_HELPER_TYPES).toBeInstanceOf(Set)
    expect(STRUCTURED_HELPER_TYPES.size).toBeGreaterThan(0)
  })

  it('Should export OPAQUE_HELPER_TYPES as a Set (may be empty — see reachability.js)', () => {
    // Phase 4 §Migration #4 landed `notInUnionOf` and migrated the two
    // former opaque sites (identificationDetails, description) onto it.
    // The set is retained as the enforcement point for future opaque-
    // by-design helpers, but is currently EMPTY on the manifest — a
    // clean-slate state. Any addition here MUST cite a rationale in
    // the comment block on `OPAQUE_HELPER_TYPES` in reachability.js.
    expect(OPAQUE_HELPER_TYPES).toBeInstanceOf(Set)
  })

  it('Should keep STRUCTURED and OPAQUE helper-type sets disjoint', () => {
    const overlap = [...STRUCTURED_HELPER_TYPES].filter((t) =>
      OPAQUE_HELPER_TYPES.has(t)
    )
    expect(overlap).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Invariant #3 — STRUCTURED_HELPER_TYPES exactly matches the case
// labels dispatched inside `synthesiseWitness`. This is the load-
// bearing "can't drift" pin.
//
// Approach: static parse the reachability.js source for `case '<name>':`
// labels inside the `synthesiseWitness` function body (and the split-
// out `synthesiseBranchedGateWitness`), extract the metadata-type
// labels dispatched, then diff against the two sets. An `import * as`
// probe alone would miss a case that dispatches to a nested helper
// synth (e.g. `case 'branchedGate': return synthesiseBranchedGateWitness(...)`);
// static scan handles that uniformly.
// ---------------------------------------------------------------------------

describe('coverage — synthesiseWitness dispatch matches the declared sets', () => {
  const reachabilitySrc = readFileSync(
    fileURLToPath(new URL('./reachability.js', import.meta.url)),
    'utf-8'
  )

  // Extract every `case '<label>':` occurring in the file. Both the
  // top-level `synthesiseWitness` dispatch and the split-out
  // `synthesiseBranchedGateWitness` sit in this file; the former's
  // labels are the "top-level helper types" the coverage sets classify.
  // The latter's labels are per-operator (`equals`, `includes`,
  // `isFilled`) and are NOT helper types — filtered out below.
  const allCaseLabels = [...reachabilitySrc.matchAll(/case '([^']+)':/g)].map(
    (m) => m[1]
  )

  // The operator labels are declared inside `synthesiseBranchedGate-
  // Witness`; keep them separate so the top-level dispatch shape stays
  // easy to reason about. Any new helper type belongs in the top-level
  // switch of `synthesiseWitness`.
  const OPERATOR_LABELS = new Set(['equals', 'includes', 'isFilled'])

  const topLevelCaseLabels = allCaseLabels.filter(
    (label) => !OPERATOR_LABELS.has(label)
  )

  it('Should classify every synthesiseWitness case label as STRUCTURED or OPAQUE', () => {
    const unclassified = topLevelCaseLabels.filter(
      (label) =>
        !STRUCTURED_HELPER_TYPES.has(label) && !OPAQUE_HELPER_TYPES.has(label)
    )
    expect(unclassified).toEqual([])
  })

  it('Should have a synthesiseWitness case label for every STRUCTURED helper type', () => {
    const missingCase = [...STRUCTURED_HELPER_TYPES].filter(
      (t) => !topLevelCaseLabels.includes(t)
    )
    expect(missingCase).toEqual([])
  })

  it('Should have a synthesiseWitness case label for every OPAQUE helper type', () => {
    const missingCase = [...OPAQUE_HELPER_TYPES].filter(
      (t) => !topLevelCaseLabels.includes(t)
    )
    expect(missingCase).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Invariant #4 — enumerate every export of `helpers.js` that produces
// a gate function with `.metadata.type`, and assert the type is in the
// union of STRUCTURED + OPAQUE sets.
//
// This is the "someone added a sixth helper without a synth" catch.
// Adding a new helper that attaches `.metadata.type = 'foo'` without
// updating either set fails here with a helpful diff.
// ---------------------------------------------------------------------------

describe('coverage — every helper export classifies as STRUCTURED or OPAQUE', () => {
  // Probe each function export: call it with the minimum shape we can
  // fabricate, then inspect the returned gate's `.metadata.type`.
  // Helpers that don't produce a gate with `.metadata.type` (e.g.
  // `present` returns a raw predicate; `obligationMetadata` is an
  // accessor) are skipped — the invariant is about GATE helpers.
  const helperExports = Object.entries(helpers).filter(
    ([, exp]) => typeof exp === 'function'
  )

  it('Should classify every helper export whose gate carries .metadata.type', () => {
    // For each helper export, try to produce a gate. If the helper
    // isn't in `SAMPLE_OBLIGATIONS`, we can't probe it — but we CAN
    // fail the test with a clear message: "helper X has no sample; add
    // it to SAMPLE_OBLIGATIONS + one of the classification sets".
    //
    // Excluded from the probe by design: `present` (returns a raw
    // predicate closure — no gate metadata), `obligationMetadata` (a
    // pure accessor — no gate produced). Anything else without a
    // sample must be added.
    const NON_GATE_HELPERS = new Set(['present', 'obligationMetadata'])

    const unclassified = []
    for (const [name] of helperExports) {
      if (NON_GATE_HELPERS.has(name)) continue

      const sample = SAMPLE_OBLIGATIONS[name]
      if (!sample) {
        unclassified.push(
          `helper '${name}' — no sample in SAMPLE_OBLIGATIONS; add one and register the helper type in STRUCTURED_HELPER_TYPES or OPAQUE_HELPER_TYPES`
        )
        continue
      }
      const type = sample.applyTo?.metadata?.type
      if (!type) {
        unclassified.push(
          `helper '${name}' — sample.applyTo.metadata.type missing; helper must attach a metadata.type or be added to NON_GATE_HELPERS`
        )
        continue
      }
      if (
        !STRUCTURED_HELPER_TYPES.has(type) &&
        !OPAQUE_HELPER_TYPES.has(type)
      ) {
        unclassified.push(
          `helper '${name}' — metadata.type '${type}' is not in STRUCTURED_HELPER_TYPES or OPAQUE_HELPER_TYPES; add it (with a comment) to one of the sets in analysis/reachability.js`
        )
      }
    }
    expect(unclassified).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Invariants #5 + #6 — fidelity round-trip. For each STRUCTURED helper
// type, `synthesiseWitness` returns WITNESS (or TRIVIAL when the sample
// is by construction total). For each OPAQUE helper type, it returns
// OPAQUE. Belt-and-braces: even if invariants #1-#4 pass, a synth
// dispatch that returns the wrong kind for a listed type is caught here.
// ---------------------------------------------------------------------------

describe('coverage — synthesiseWitness classifies each helper sample as declared', () => {
  it('Should synthesise every STRUCTURED helper type as a WITNESS or TRIVIAL kind', () => {
    for (const type of STRUCTURED_HELPER_TYPES) {
      const sample = Object.values(SAMPLE_OBLIGATIONS).find(
        (s) => s.applyTo?.metadata?.type === type
      )
      expect(
        sample,
        `no SAMPLE_OBLIGATIONS entry produces metadata.type='${type}' — add one so this invariant can prove the STRUCTURED classification is honest`
      ).toBeDefined()
      const w = synthesiseWitness(sample)
      expect(
        [WITNESS_KIND.WITNESS, WITNESS_KIND.TRIVIAL],
        `STRUCTURED helper type '${type}' synthesised as '${w.kind}' — a structured helper must be witness-synthesisable or trivially open, never opaque`
      ).toContain(w.kind)
    }
  })

  it('Should synthesise every OPAQUE helper type to WITNESS_KIND.OPAQUE', () => {
    for (const type of OPAQUE_HELPER_TYPES) {
      const sample = Object.values(SAMPLE_OBLIGATIONS).find(
        (s) => s.applyTo?.metadata?.type === type
      )
      expect(
        sample,
        `no SAMPLE_OBLIGATIONS entry produces metadata.type='${type}' — add one`
      ).toBeDefined()
      const w = synthesiseWitness(sample)
      expect(w.kind).toBe(WITNESS_KIND.OPAQUE)
    }
  })
})
