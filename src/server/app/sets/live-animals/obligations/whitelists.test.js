/**
 * Whitelist scope tests.
 *
 * V4 gates nine commodity-scoped obligations on the commodities
 * service's allowlists — CN codes, or Latin names for the permanent
 * address. Silently widening any allowlist is a real risk (e.g. adding a
 * code to the package-count list that puts `numberOfPackages` in scope
 * for a new commodity). This test iterates every `(allowlist,
 * gated-obligation)` pair and, for every entry, evaluates a scripted
 * fulfilment and asserts the obligation is in scope. It also asserts a
 * control value (NOT in any allowlist) does NOT put the obligation in
 * scope, and pins each allowlist's expected shape so a single-file edit
 * to the service lists fails loudly here.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { createObligationEvaluator } from '../../../model/obligations/evaluator.js'
import {
  obligations as v4Obligations,
  commodityCode,
  numberOfPackages,
  cph,
  containsUnweanedAnimals,
  microchip,
  passport,
  tattoo,
  earTag,
  horseName,
  permanentAddress,
  species
} from './index.js'
import {
  cphExemptCommodityCodes,
  earTagCommodities,
  horseNameCommodities,
  microchipCommodities,
  packageCountCommodities,
  passportCommodities,
  permanentAddressSpecies,
  tattooCommodities,
  unweanedCommodities
} from '../services/commodities/index.js'

// Sentinel — a value deliberately not present in any V4 allowlist. If a
// real code or species ever matches, change this to another
// definitely-not-listed value.
const CONTROL_VALUE = 'Unicorn'

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
  for (const code of packageCountCommodities()) {
    it(`Should put numberOfPackages in scope for a line with code = '${code}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      const fulfilmentIndexes =
        state.obligations[numberOfPackages.id].fulfilmentIndexes ?? []
      expect(fulfilmentIndexes).toContain('line1')
    })
  }

  it(`Should not put numberOfPackages in scope for a control value`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_VALUE }
    })
    const fulfilmentIndexes =
      state.obligations[numberOfPackages.id].fulfilmentIndexes ?? []
    expect(fulfilmentIndexes).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Notification-level gate: cph
//
// `cph` is a top-level singleton with
// `applyTo: anyNotInUnionOf(commodityCode, cphExemptCommodityCodes(), …)`.
// In scope iff ANY commodity line has a code outside the exemptions, so a
// code nobody thought about is asked rather than silently let off.
// ---------------------------------------------------------------------------

describe('CPH exemptions → cph (top-level anyNotInUnionOf)', () => {
  for (const code of cphExemptCommodityCodes()) {
    it(`Should not put cph in scope for a consignment of code '${code}' alone`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      expect(state.obligations[cph.id].inScope).toBe(false)
    })
  }

  it('Should not put cph in scope when every line is exempt', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '0101', line2: '01061900' }
    })
    expect(state.obligations[cph.id].inScope).toBe(false)
  })

  // Pigs (0103) were not in the old catalogue. Outside the exemptions, so
  // asked — even alongside an exempt horse.
  it('Should put cph in scope when any line is not exempt', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '0101', line2: '0103' }
    })
    expect(state.obligations[cph.id].inScope).toBe(true)
  })

  it('Should put cph in scope for a code on no list at all', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_VALUE }
    })
    expect(state.obligations[cph.id].inScope).toBe(true)
  })

  it('Should not put cph in scope before any line has a code', () => {
    const state = evaluate({})
    expect(state.obligations[cph.id].inScope).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Notification-level gate: containsUnweanedAnimals
//
// `anyAllowListed(commodityCode, unweanedCommodities())` — the question is
// asked once for the consignment as soon as ANY line carries an unweaned code.
// ---------------------------------------------------------------------------

describe('unweaned list → containsUnweanedAnimals (top-level anyAllowListed)', () => {
  for (const code of unweanedCommodities()) {
    it(`Should put containsUnweanedAnimals in scope when a line has code = '${code}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      expect(state.obligations[containsUnweanedAnimals.id].inScope).toBe(true)
    })
  }

  it(`Should not put containsUnweanedAnimals in scope when no line matches`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_VALUE }
    })
    expect(state.obligations[containsUnweanedAnimals.id].inScope).toBe(false)
  })

  it('Should not put containsUnweanedAnimals in scope for a horses-only consignment', () => {
    const state = evaluate({
      [commodityCode.id]: { line1: '0101' }
    })
    expect(state.obligations[containsUnweanedAnimals.id].inScope).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unit-record-scoped gates: microchip / passport / tattoo / earTag /
// horseName read the line's code; permanentAddress reads its species.
// Each uses `applyTo: allowListed(<gate>, LIST, unitRecord, …)`, so
// records are `lineId.unitId` fulfilment indexes for units on matching
// lines.
//
// A unit record is observed via a seed on the gated obligation itself
// (raw storage at `line1.unit1`), which pre-purge enumeration reads as
// a unitRecord instance. On the positive path applyTo returns
// ['line1.unit1']; on the negative path it returns [].
// ---------------------------------------------------------------------------

const UNIT_SCOPED_ALLOWLISTS = [
  {
    name: 'microchip list',
    gate: commodityCode,
    values: microchipCommodities(),
    gated: microchip
  },
  {
    name: 'passport list',
    gate: commodityCode,
    values: passportCommodities(),
    gated: passport
  },
  {
    name: 'tattoo list',
    gate: commodityCode,
    values: tattooCommodities(),
    gated: tattoo
  },
  {
    name: 'ear-tag list',
    gate: commodityCode,
    values: earTagCommodities(),
    gated: earTag
  },
  {
    name: 'horse-name list',
    gate: commodityCode,
    values: horseNameCommodities(),
    gated: horseName
  },
  {
    name: 'permanent-address list',
    gate: species,
    values: permanentAddressSpecies(),
    gated: permanentAddress
  }
]

for (const { name, gate, values, gated } of UNIT_SCOPED_ALLOWLISTS) {
  describe(`${name} → ${gated.name} (unit-record-scoped)`, () => {
    for (const value of values) {
      it(`Should put ${gated.name} in scope for a unit under ${gate.name} = '${value}'`, () => {
        const state = evaluate({
          [gate.id]: { line1: value },
          [gated.id]: { 'line1.unit1': '' }
        })
        const fulfilmentIndexes =
          state.obligations[gated.id].fulfilmentIndexes ?? []
        expect(fulfilmentIndexes).toContain('line1.unit1')
      })
    }

    it(`Should not put ${gated.name} in scope for a control value`, () => {
      const state = evaluate({
        [gate.id]: { line1: CONTROL_VALUE },
        [gated.id]: { 'line1.unit1': '' }
      })
      const fulfilmentIndexes =
        state.obligations[gated.id].fulfilmentIndexes ?? []
      expect(fulfilmentIndexes).toEqual([])
    })
  })
}

// The genus Felis — MDM's "Cat" — sits under 01061900 beside the domestic
// cat but is not asked for a permanent address.
it('Should not put permanentAddress in scope for the genus Felis', () => {
  const state = evaluate({
    [commodityCode.id]: { line1: '01061900' },
    [species.id]: { line1: 'Felis' },
    [permanentAddress.id]: { 'line1.unit1': '' }
  })
  expect(
    state.obligations[permanentAddress.id].fulfilmentIndexes ?? []
  ).toEqual([])
})

// ---------------------------------------------------------------------------
// Anti-drift — every allowlist has a hard-coded expected shape here.
// This is what catches silent widening or narrowing: the service list
// must equal the expected set exactly. Positive-case tests above iterate
// the *service* list; if only that were tested, widening the list would
// just add passing cases. The equality check below is what makes the
// whole exercise trustworthy.
//
// To intentionally change an allowlist:
//   1. edit the list in `services/commodities/rules.js`
//   2. update the matching expected list below
//   3. re-run tests — new positive cases pass, drift check passes
// Any single-file edit fails the drift check. That's the invariant.
// ---------------------------------------------------------------------------

const EXPECTED = {
  'package-count list': [
    '0101',
    '0102',
    '0103',
    '010410',
    '010420',
    '01051111',
    '01051200',
    '01051300',
    '01051400',
    '01051500',
    '01059400',
    '01059910',
    '01059920',
    '01059930',
    '01059950',
    '01061410',
    '01061900',
    '01062000',
    '01063100',
    '01063200',
    '01063980',
    '01064100',
    '01064900',
    '05111000',
    '05119985'
  ],
  'CPH exemptions': ['0101', '01061900'],
  'unweaned list': ['0102', '0103'],
  'microchip list': ['0101', '01061900'],
  'passport list': ['0101', '0102', '01061900'],
  'tattoo list': ['01061900'],
  'ear-tag list': ['0102'],
  'horse-name list': ['0101'],
  'permanent-address list': [
    'Canis familiaris',
    'Canis lupus familiaris',
    'Felis catus',
    'Mustela putorius furo'
  ]
}

const ALLOWLISTS_UNDER_TEST = [
  { name: 'package-count list', values: packageCountCommodities() },
  { name: 'CPH exemptions', values: cphExemptCommodityCodes() },
  { name: 'unweaned list', values: unweanedCommodities() },
  { name: 'microchip list', values: microchipCommodities() },
  { name: 'passport list', values: passportCommodities() },
  { name: 'tattoo list', values: tattooCommodities() },
  { name: 'ear-tag list', values: earTagCommodities() },
  { name: 'horse-name list', values: horseNameCommodities() },
  { name: 'permanent-address list', values: permanentAddressSpecies() }
]

describe('anti-drift — every allowlist matches its expected shape', () => {
  for (const { name, values } of ALLOWLISTS_UNDER_TEST) {
    it(`Should have the ${name} contain exactly the expected values`, () => {
      // Order-insensitive: a reordering is not drift.
      expect([...values].sort()).toEqual([...EXPECTED[name]].sort())
    })
  }
})
