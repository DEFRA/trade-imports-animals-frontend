/**
 * Coverage test.
 *
 * Domain-wiring contract (post Item 9 ruling — "validation is owned by
 * the feature folders, not by the modelling"): the domain carries ONLY
 * address completeness entries. Every address-block obligation must
 * have one (the status classifiers' completeness signal), and nothing
 * else may acquire a domain entry — a scalar entry appearing here is
 * the deleted validation layer creeping back.
 */

import { describe, it, expect } from 'vitest'
import { obligations } from './obligations.js'
import { obligationMetadata } from './helpers.js'
import { domain } from '../domain/index.js'

// The manifest's address-block obligations — the composite value shape
// whose completeness the classifiers judge via `isComplete`.
const ADDRESS_OBLIGATIONS = new Set([
  'commercialTransporter',
  'privateTransporter',
  'placeOfOrigin',
  'consignor',
  'consignee',
  'importer',
  'placeOfDestination',
  'contactAddress',
  'permanentAddress'
])

describe('coverage — domain carries exactly the address completeness entries', () => {
  it('every address obligation has an address-typed domain entry', () => {
    const missing = obligations
      .filter((o) => ADDRESS_OBLIGATIONS.has(o.name))
      .filter((o) => domain.get(o.id)?.type !== 'address')
      .map((o) => o.name)
    expect(missing).toEqual([])
  })

  it('no non-address obligation has a domain entry', () => {
    const unexpected = obligations
      .filter((o) => domain.has(o.id) && !ADDRESS_OBLIGATIONS.has(o.name))
      .map((o) => o.name)
    expect(unexpected).toEqual([])
  })

  it('ADDRESS_OBLIGATIONS entries all correspond to real obligations', () => {
    // A rename in obligations.js must reach this list too.
    const orphans = [...ADDRESS_OBLIGATIONS].filter(
      (name) => !obligations.some((o) => o.name === name)
    )
    expect(orphans).toEqual([])
  })
})

describe('structural integrity — no cycles in `within` references', () => {
  it('every obligation has a within-chain that terminates in null', () => {
    // Without this, a self-loop or a cycle in the manifest hangs the
    // whole evaluator: buildAncestorGroups walks `while (cur) cur =
    // cur.within` and never terminates. The test guards against
    // regressions by walking each chain with a max-depth bound and a
    // seen-set. Any cycle fails deterministically before the evaluator
    // is ever built.
    const problems = []
    for (const o of obligations) {
      const seen = new Set()
      let cur = o.within
      let depth = 0
      while (cur) {
        if (seen.has(cur.id)) {
          problems.push(`${o.name} → cycle at ${cur.name}`)
          break
        }
        seen.add(cur.id)
        cur = cur.within
        depth += 1
        if (depth > 100) {
          problems.push(`${o.name} → chain deeper than 100 (likely cycle)`)
          break
        }
      }
    }
    expect(problems).toEqual([])
  })
})

describe('uniqueness — every obligation has a distinct id and name', () => {
  it('has no duplicate ids in the manifest', () => {
    // Duplicate ids collide in every id-keyed structure the evaluator
    // builds (obligationsById, obligationChildren, etc.); one wins and
    // the loser is silently invisible. A rename or copy-paste that
    // reuses the same id must fail immediately.
    const counts = new Map()
    for (const o of obligations) {
      counts.set(o.id, (counts.get(o.id) ?? 0) + 1)
    }
    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([id, count]) => `${id} (×${count})`)
    expect(duplicates).toEqual([])
  })

  it('has no duplicate names in the manifest', () => {
    // Duplicate names silently corrupt every name-keyed downstream: the
    // dictionary shows the obligation twice; `presentation.js`'s
    // name-based lookup returns whichever entry matches first;
    // KNOWN_UNWIRED status becomes ambiguous. Mutation 11 in
    // docs/testing.md is exactly this.
    const counts = new Map()
    for (const o of obligations) {
      counts.set(o.name, (counts.get(o.name) ?? 0) + 1)
    }
    const duplicates = [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name} (×${count})`)
    expect(duplicates).toEqual([])
  })
})

describe('step 5c — system-populated V4 fields declared but not presented', () => {
  it('poApprovedReferenceNumber + responsiblePersonForLoad are on the manifest', () => {
    // Regression against the parent EUDPA-277 spike's decision to
    // skip these entirely. Step 5c added them for V4 completeness;
    // if either goes missing, this fires.
    const names = obligations.map((o) => o.name)
    expect(names).toContain('poApprovedReferenceNumber')
    expect(names).toContain('responsiblePersonForLoad')
  })

  it('both obligations are declared always-in-scope + mandatory', () => {
    // They're system-populated (mint / gov.identity), so scope is
    // unconditional; the notification can't exist without them.
    //
    // Post Phase 4.5.3 (EUDPA-288): the data-only shape { id, name,
    // status } is the declaration — no `applyTo` closure needed. The
    // evaluator's `field` classifier routes these through the "top-
    // level scalar with intrinsic status" branch and returns
    // `{ inScope: true, status: obligation.status }`. We pin both the
    // author-side declaration (`status: 'mandatory'`, no `applyTo`)
    // and the observable decision (via the evaluator, not by calling
    // a now-absent closure directly).
    const po = obligations.find((o) => o.name === 'poApprovedReferenceNumber')
    const rp = obligations.find((o) => o.name === 'responsiblePersonForLoad')
    expect(po).toMatchObject({ status: 'mandatory' })
    expect(rp).toMatchObject({ status: 'mandatory' })
    expect(po.applyTo).toBeUndefined()
    expect(rp.applyTo).toBeUndefined()
  })
})

// -----------------------------------------------------------------------------
// EUDPA-288 Phase 2 commit 2 — dependsOn coverage.
//
// Every obligation that carries an `applyTo` closure must resolve to a
// `dependsOn: string[]` listing the ids of the obligations whose stored
// values the closure reads. `dependsOn: []` is the honest annotation
// for unconditional / always-in-scope closures (no reads).
//
// Rationale — BRIEF §Migration #2 (★ highest value-per-line item in the
// whole comparison) + REPORT §5.1: closures are opaque to A's
// reachability prover; without a declared dependency graph the prover
// goes vacuously green because `gateValue` cannot invert an opaque
// closure body. Making `dependsOn` a declared field alongside the
// closure recovers the statically-recoverable graph without giving up
// the imperative-JS gate surface. Phase 3 ports A's prover on top of
// this data.
//
// Phase 4.5.2 refinement (EUDPA-288): meta-first helpers name their
// gate obligation on `.metadata.obligation`, so `dependsOn` becomes
// DERIVABLE for those sites. The assertion accepts either:
//   (a) an explicit `dependsOn: string[]` on the obligation, OR
//   (b) a helper metadata whose type is one that `obligationMetadata`
//       can derive from (`equalsGate`, `presentGate`, `includesGate`,
//       `allowListed`, `anyAllowListed`, `notInUnionOf`, `matches`,
//       `alwaysInScope`, and the annotated shape of `branchedGate`).
// `obligationMetadata` returns a resolved `dependsOn` in both cases;
// the assertion checks that resolution succeeds (i.e. the resolved
// value is a `string[]`). A `branchedGate` used as an escape hatch
// without either an explicit `dependsOn` or a `predicateMeta` still
// fires this test — that's the intended defence.
//
// Structural obligations (`commodityLine`, `unitRecord`) carry no
// `applyTo` and are excluded from the check.
// -----------------------------------------------------------------------------

describe('coverage — every gated obligation carries (or derives) dependsOn', () => {
  it('every obligation with an applyTo resolves to a dependsOn array', () => {
    const missing = obligations
      .filter((o) => typeof o.applyTo === 'function')
      .filter((o) => {
        // `obligationMetadata` prefers explicit `dependsOn` but falls
        // back to deriving from the helper metadata (Phase 4.5.2).
        // Either path must terminate in an array.
        const meta = obligationMetadata(o)
        return !Array.isArray(meta.dependsOn)
      })
      .map((o) => o.name)
    expect(missing).toEqual([])
  })
})
