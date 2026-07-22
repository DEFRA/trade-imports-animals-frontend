/**
 * Whitelist scope tests — closes gap 1 from `docs/testing.md`
 * (mutation 3).
 *
 * V4 gates seven commodity-scoped obligations on the commodities
 * service's allowlists, in the stored picker-name vocabulary.
 * Silently widening any allowlist is a real risk (e.g. adding a name
 * to the package-count list that puts `numberOfPackages` in scope for
 * a new commodity). This test iterates every `(allowlist,
 * gated-obligation)` pair and — for every entry the picker can store —
 * evaluates a scripted fulfilment and asserts the obligation is in
 * scope. It also asserts a control value (NOT in any allowlist) does
 * NOT put the obligation in scope, and pins each allowlist's expected
 * shape so a single-file edit to the service lists fails loudly here.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createObligationEvaluator } from './evaluator.js'
import {
  obligations as v4Obligations,
  commodityCode,
  numberOfPackages,
  cph,
  passport,
  tattoo,
  earTag,
  horseName,
  permanentAddress
} from './obligations.js'
import {
  cphCommodities,
  earTagCommodities,
  horseNameCommodities,
  list,
  packageCountCommodities,
  passportCommodities,
  permanentAddressCommodities,
  tattooCommodities
} from '../../services/commodities/index.js'

// Sentinel — a commodity name deliberately not present in any V4
// allowlist and not a picker name. If a real commodity ever matches,
// change this to another definitely-not-listed value.
const CONTROL_NAME = 'Unicorn'

// The package-count list mirrors the real reference data verbatim:
// picker names plus inert 'CODE - Label' display strings no stored
// selection can ever equal. Only the picker-name entries are storable.
const storablePackageCountCommodities = () => {
  const pickerNames = new Set(list())
  return packageCountCommodities().filter((entry) => pickerNames.has(entry))
}

let evaluate
beforeAll(() => {
  const evaluator = createObligationEvaluator({ obligations: v4Obligations })
  evaluate = (fulfilments) => evaluator.evaluate(fulfilments)
})

// ---------------------------------------------------------------------------
// Line-scoped gate: numberOfPackages
//
// `numberOfPackages` is `within: commodityLine` with
// `applyTo: allowListed(commodityCode, packageCountCommodities(), null, …)`.
// Records at line-instance granularity — one per matching line.
// ---------------------------------------------------------------------------

describe('package-count list → numberOfPackages (line-scoped)', () => {
  for (const name of storablePackageCountCommodities()) {
    it(`Should put numberOfPackages in scope for a line with commodity = '${name}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: name }
      })
      const records = state.obligations[numberOfPackages.id].records ?? []
      expect(records.map((record) => record.fulfilmentId)).toContain('line1')
    })
  }

  it(`Should not put numberOfPackages in scope for a control value`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_NAME }
    })
    const records = state.obligations[numberOfPackages.id].records ?? []
    expect(records).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Notification-level gate: cph
//
// `cph` is a top-level singleton with
// `applyTo: anyAllowListed(commodityCode, cphCommodities(), …)`.
// In scope iff ANY commodity line has a matching commodity.
// ---------------------------------------------------------------------------

describe('CPH list → cph (top-level anyAllowListed)', () => {
  for (const name of cphCommodities()) {
    it(`Should put cph in scope when a line has commodity = '${name}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: name }
      })
      expect(state.obligations[cph.id].inScope).toBe(true)
    })
  }

  it(`Should not put cph in scope when no line matches`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_NAME }
    })
    expect(state.obligations[cph.id].inScope).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unit-record-scoped gates: passport / tattoo / earTag / horseName /
// permanentAddress. Each uses
// `applyTo: allowListed(commodityCode, LIST, unitRecord, …)`, so
// records are `lineId/unitId` paths for units on matching-commodity
// lines.
//
// A unit record is observed via a seed on the gated obligation itself
// (raw storage at `line1/unit1`), which pre-purge enumeration reads as
// a unitRecord instance. On the positive path applyTo returns
// ['line1/unit1']; on the negative path it returns [].
// ---------------------------------------------------------------------------

const UNIT_SCOPED_ALLOWLISTS = [
  { name: 'passport list', names: passportCommodities(), gated: passport },
  { name: 'tattoo list', names: tattooCommodities(), gated: tattoo },
  { name: 'ear-tag list', names: earTagCommodities(), gated: earTag },
  { name: 'horse-name list', names: horseNameCommodities(), gated: horseName },
  {
    name: 'permanent-address list',
    names: permanentAddressCommodities(),
    gated: permanentAddress
  }
]

for (const { name, names, gated } of UNIT_SCOPED_ALLOWLISTS) {
  describe(`${name} → ${gated.name} (unit-record-scoped)`, () => {
    for (const commodity of names) {
      it(`Should put ${gated.name} in scope for a unit under commodity = '${commodity}'`, () => {
        const state = evaluate({
          [commodityCode.id]: { line1: commodity },
          [gated.id]: { 'line1/unit1': '' }
        })
        const records = state.obligations[gated.id].records ?? []
        expect(records.map((record) => record.fulfilmentId)).toContain(
          'line1/unit1'
        )
      })
    }

    it(`Should not put ${gated.name} in scope for a control value`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: CONTROL_NAME },
        [gated.id]: { 'line1/unit1': '' }
      })
      const records = state.obligations[gated.id].records ?? []
      expect(records).toEqual([])
    })
  })
}

// ---------------------------------------------------------------------------
// Anti-drift — every allowlist has a hard-coded expected shape here.
// This is what catches mutation 3 (silent widening or narrowing): the
// service list must equal the expected set exactly. Positive-case
// tests above iterate the *service* list; if only that were tested,
// widening the list would just add passing cases. The equality check
// below is what makes the whole exercise trustworthy.
//
// To intentionally change an allowlist:
//   1. edit the list in `services/commodities/stub.js`
//   2. update the matching expected list below
//   3. re-run tests — new positive cases pass, drift check passes
// Any single-file edit fails the drift check. That's the invariant.
// ---------------------------------------------------------------------------

const EXPECTED = {
  'storable package-count entries': ['Cat', 'Cow', 'Dog', 'Horse'],
  'CPH list': ['Cow'],
  'passport list': ['Horse', 'Cow', 'Cat', 'Dog'],
  'tattoo list': ['Cat', 'Dog', 'Cow'],
  'ear-tag list': ['Cow'],
  'horse-name list': ['Horse'],
  'permanent-address list': ['Cat', 'Dog']
}

const ALLOWLISTS_UNDER_TEST = [
  {
    name: 'storable package-count entries',
    names: storablePackageCountCommodities()
  },
  { name: 'CPH list', names: cphCommodities() },
  { name: 'passport list', names: passportCommodities() },
  { name: 'tattoo list', names: tattooCommodities() },
  { name: 'ear-tag list', names: earTagCommodities() },
  { name: 'horse-name list', names: horseNameCommodities() },
  { name: 'permanent-address list', names: permanentAddressCommodities() }
]

describe('anti-drift — every allowlist matches its expected shape', () => {
  for (const { name, names } of ALLOWLISTS_UNDER_TEST) {
    it(`Should have the ${name} contain exactly the expected commodities`, () => {
      // Order-insensitive: a reordering is not drift.
      expect([...names].sort()).toEqual([...EXPECTED[name]].sort())
    })
  }
})
