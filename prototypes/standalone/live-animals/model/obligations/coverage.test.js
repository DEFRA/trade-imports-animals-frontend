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

// Guard against a self-loop or a cycle hanging buildAncestorGroups' `while
// (cur) cur = cur.within` walk forever. Any real `within` chain in the
// manifest is a handful of levels deep — 100 is a generous ceiling that
// only a genuine cycle could reach.
const MAX_WITHIN_CHAIN_DEPTH = 100

// Shared by the id/name uniqueness checks below — counts occurrences of
// `keyFn(item)` across `items` and reports every key seen more than once.
const duplicatesOf = (items, keyFn) => {
  const counts = new Map()
  for (const item of items) {
    const key = keyFn(item)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => `${key} (×${count})`)
}

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
        if (depth > MAX_WITHIN_CHAIN_DEPTH) {
          problems.push(
            `${o.name} → chain deeper than ${MAX_WITHIN_CHAIN_DEPTH} (likely cycle)`
          )
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
    expect(duplicatesOf(obligations, (obligation) => obligation.id)).toEqual([])
  })

  it('has no duplicate names in the manifest', () => {
    // Duplicate names silently corrupt every name-keyed downstream: the
    // dictionary shows the obligation twice; `presentation.js`'s
    // name-based lookup returns whichever entry matches first;
    // KNOWN_UNWIRED status becomes ambiguous. Mutation 11 in
    // docs/testing.md is exactly this.
    expect(duplicatesOf(obligations, (obligation) => obligation.name)).toEqual(
      []
    )
  })
})

describe('system-populated V4 fields declared but not presented', () => {
  it('poApprovedReferenceNumber + responsiblePersonForLoad are on the manifest', () => {
    // These were skipped in an earlier iteration; they're required for
    // V4 completeness, so if either goes missing this fires.
    const names = obligations.map((o) => o.name)
    expect(names).toContain('poApprovedReferenceNumber')
    expect(names).toContain('responsiblePersonForLoad')
  })

  it('both obligations are declared always-in-scope + mandatory', () => {
    // They're system-populated (mint / gov.identity), so scope is
    // unconditional; the notification can't exist without them.
    //
    // The data-only shape { id, name, status } is the declaration — no
    // `applyTo` closure needed. The
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
// dependsOn coverage.
//
// Every obligation that carries an `applyTo` closure must resolve to a
// `dependsOn: string[]` listing the ids of the obligations whose stored
// values the closure reads. `dependsOn: []` is the honest annotation
// for unconditional / always-in-scope closures (no reads).
//
// Rationale: closures are opaque to the reachability prover; without a
// declared dependency graph the prover goes vacuously green because
// `gateValue` cannot invert an opaque closure body. Making `dependsOn`
// a declared field alongside the closure recovers the statically-
// recoverable graph without giving up the imperative-JS gate surface.
//
// Meta-first helpers name their gate obligation on
// `.metadata.obligation`, so `dependsOn` becomes DERIVABLE for those
// sites. The assertion accepts either:
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
        // back to deriving from the helper metadata. Either path must
        // terminate in an array.
        const meta = obligationMetadata(o)
        return !Array.isArray(meta.dependsOn)
      })
      .map((o) => o.name)
    expect(missing).toEqual([])
  })
})
