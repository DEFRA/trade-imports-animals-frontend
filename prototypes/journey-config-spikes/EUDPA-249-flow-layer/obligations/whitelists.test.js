/**
 * Whitelist scope tests — closes gap 1 from `docs/testing.md`
 * (mutation 3).
 *
 * V4 gates seven commodity-code-scoped obligations on named
 * whitelists in `obligations.js`. Silently widening any whitelist is a
 * real risk (e.g. adding a code to `PACKAGE_COUNT_COMMODITIES` that
 * puts `numberOfPackages` in scope for a new commodity). This test
 * iterates every `(whitelist, gated-obligation)` pair and — for every
 * code in the whitelist — evaluates a scripted fulfilment and asserts
 * the obligation is in scope. It also asserts a control code (NOT in
 * any of the seven whitelists) does NOT put the obligation in scope.
 *
 * If a whitelist changes and a member drops off, the corresponding
 * positive test fails. If a whitelist gains a member without a test
 * update, the test file needs a new positive case — enforced by the
 * "no whitelist has an untested code" guard test at the bottom.
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
  permanentAddress,
  PACKAGE_COUNT_COMMODITIES,
  CPH_REQUIRED_COMMODITIES,
  PASSPORT_COMMODITIES,
  TATTOO_COMMODITIES,
  EAR_TAG_COMMODITIES,
  HORSE_NAME_COMMODITIES,
  PERMANENT_ADDRESS_COMMODITIES
} from './obligations.js'

// Sentinel — a commodity code deliberately not present in any V4
// whitelist. If a real V4 code ever matches, change this to another
// definitely-not-listed value.
const CONTROL_CODE = '99999999'

let evaluate
beforeAll(() => {
  const evaluator = createObligationEvaluator({ obligations: v4Obligations })
  evaluate = (fulfilments) => evaluator.evaluate(fulfilments)
})

// ---------------------------------------------------------------------------
// Line-scoped gate: numberOfPackages
//
// `numberOfPackages` is `within: commodityLine` with
// `applyTo: allowListed(commodityCode, PACKAGE_COUNT_COMMODITIES, null, …)`.
// Records at line-instance granularity — one per matching line.
// ---------------------------------------------------------------------------

describe('PACKAGE_COUNT_COMMODITIES → numberOfPackages (line-scoped)', () => {
  for (const code of PACKAGE_COUNT_COMMODITIES) {
    it(`puts numberOfPackages in scope for a line with commodityCode = '${code}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      const records = state.obligations[numberOfPackages.id].records ?? []
      expect(records.map((r) => r.fulfilmentId)).toContain('line1')
    })
  }

  it(`does NOT put numberOfPackages in scope for a control code`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_CODE }
    })
    const records = state.obligations[numberOfPackages.id].records ?? []
    expect(records).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Notification-level gate: cph
//
// `cph` is a top-level singleton with
// `applyTo: anyAllowListed(commodityCode, CPH_REQUIRED_COMMODITIES, …)`.
// In scope iff ANY commodity line has a matching code.
// ---------------------------------------------------------------------------

describe('CPH_REQUIRED_COMMODITIES → cph (top-level anyAllowListed)', () => {
  for (const code of CPH_REQUIRED_COMMODITIES) {
    it(`puts cph in scope when a line has commodityCode = '${code}'`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: code }
      })
      expect(state.obligations[cph.id].inScope).toBe(true)
    })
  }

  it(`does NOT put cph in scope when no line matches`, () => {
    const state = evaluate({
      [commodityCode.id]: { line1: CONTROL_CODE }
    })
    expect(state.obligations[cph.id].inScope).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Unit-record-scoped gates: passport / tattoo / earTag / horseName /
// permanentAddress. Each uses
// `applyTo: allowListed(commodityCode, LIST, unitRecord, …)`, so
// records are `lineId/unitId` paths for units on matching-code lines.
//
// A unit record is observed via a seed on the gated obligation itself
// (raw storage at `line1/unit1`), which pre-purge enumeration reads as
// a unitRecord instance. On the positive path applyTo returns
// ['line1/unit1']; on the negative path it returns [].
// ---------------------------------------------------------------------------

const UNIT_SCOPED_WHITELISTS = [
  {
    name: 'PASSPORT_COMMODITIES',
    codes: PASSPORT_COMMODITIES,
    gated: passport
  },
  { name: 'TATTOO_COMMODITIES', codes: TATTOO_COMMODITIES, gated: tattoo },
  { name: 'EAR_TAG_COMMODITIES', codes: EAR_TAG_COMMODITIES, gated: earTag },
  {
    name: 'HORSE_NAME_COMMODITIES',
    codes: HORSE_NAME_COMMODITIES,
    gated: horseName
  },
  {
    name: 'PERMANENT_ADDRESS_COMMODITIES',
    codes: PERMANENT_ADDRESS_COMMODITIES,
    gated: permanentAddress
  }
]

for (const { name, codes, gated } of UNIT_SCOPED_WHITELISTS) {
  describe(`${name} → ${gated.name} (unit-record-scoped)`, () => {
    for (const code of codes) {
      it(`puts ${gated.name} in scope for a unit under commodityCode = '${code}'`, () => {
        const state = evaluate({
          [commodityCode.id]: { line1: code },
          [gated.id]: { 'line1/unit1': '' }
        })
        const records = state.obligations[gated.id].records ?? []
        expect(records.map((r) => r.fulfilmentId)).toContain('line1/unit1')
      })
    }

    it(`does NOT put ${gated.name} in scope for a control code`, () => {
      const state = evaluate({
        [commodityCode.id]: { line1: CONTROL_CODE },
        [gated.id]: { 'line1/unit1': '' }
      })
      const records = state.obligations[gated.id].records ?? []
      expect(records).toEqual([])
    })
  })
}

// ---------------------------------------------------------------------------
// Anti-drift — every whitelist has a hard-coded expected shape here.
// This is what catches mutation 3 (silent widening or narrowing): the
// imported constant must equal the expected set exactly. Positive-case
// tests above iterate the *imported* list; if only that were tested,
// widening the list would just add passing cases. The equality check
// below is what makes the whole exercise trustworthy.
//
// To intentionally change a whitelist:
//   1. edit the constant in `obligations.js`
//   2. update the matching expected list below
//   3. re-run tests — new positive cases pass, drift check passes
// Any single-file edit fails the drift check. That's the invariant.
// ---------------------------------------------------------------------------

const EXPECTED = {
  PACKAGE_COUNT_COMMODITIES: ['01064100', '01063100', '01061900', '0102'],
  CPH_REQUIRED_COMMODITIES: [
    // Mammals
    '0102',
    '0103',
    '010410',
    '010420',
    // Poultry — Day-old chicks
    '01051111',
    '01051200',
    '01051300',
    '01051400',
    '01051500',
    // Poultry — Adult Birds
    '01059400',
    '01059910',
    '01059920',
    '01059930',
    '01059950',
    // Poultry — Hatching eggs
    '04071100',
    '04071911',
    '04071919'
  ],
  PASSPORT_COMMODITIES: ['0101', '0102', '01061900'],
  TATTOO_COMMODITIES: ['01061900', '0103', '0102'],
  EAR_TAG_COMMODITIES: ['0102', '0103', '010410', '010420'],
  HORSE_NAME_COMMODITIES: ['0101'],
  PERMANENT_ADDRESS_COMMODITIES: ['01061900']
}

const WHITELISTS_UNDER_TEST = [
  { name: 'PACKAGE_COUNT_COMMODITIES', codes: PACKAGE_COUNT_COMMODITIES },
  { name: 'CPH_REQUIRED_COMMODITIES', codes: CPH_REQUIRED_COMMODITIES },
  { name: 'PASSPORT_COMMODITIES', codes: PASSPORT_COMMODITIES },
  { name: 'TATTOO_COMMODITIES', codes: TATTOO_COMMODITIES },
  { name: 'EAR_TAG_COMMODITIES', codes: EAR_TAG_COMMODITIES },
  { name: 'HORSE_NAME_COMMODITIES', codes: HORSE_NAME_COMMODITIES },
  {
    name: 'PERMANENT_ADDRESS_COMMODITIES',
    codes: PERMANENT_ADDRESS_COMMODITIES
  }
]

describe('anti-drift — every whitelist matches its expected shape', () => {
  for (const { name, codes } of WHITELISTS_UNDER_TEST) {
    it(`${name} contains exactly the expected codes`, () => {
      // Order-insensitive: a reordering is not drift.
      expect([...codes].sort()).toEqual([...EXPECTED[name]].sort())
    })
  }
})
